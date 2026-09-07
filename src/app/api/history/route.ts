import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { limiter } from '@/utils/rateLimit';

const yahooFinance = new YahooFinance();

export interface HistoryPoint {
  date: string; // yyyy-mm-dd
  close: number;
}

export interface HistorySeries {
  currency: string;
  points: HistoryPoint[];
}

const CACHE = new Map<string, { series: HistorySeries; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 h: son cierres diarios, no hace falta más

// Los índices llevan acento circunflejo (^MERV, ^GSPC), no sólo letras y puntos.
const TICKER_PATTERN = /^\^?[A-Z0-9.]{1,20}$/;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface ChartResult {
  currency: string;
  points: HistoryPoint[];
}

/**
 * Lectura directa del endpoint de Yahoo. La librería valida el esquema de la
 * respuesta y descarta los índices, que vienen sin `currency` (^MERV, ^GSPC),
 * así que sirve de respaldo para esos casos.
 */
async function fetchChartDirect(ticker: string, from: Date): Promise<ChartResult | null> {
  const params = new URLSearchParams({
    period1: String(Math.floor(from.getTime() / 1000)),
    period2: String(Math.floor(Date.now() / 1000)),
    interval: '1d',
  });
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?${params}`;

  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return null;

  const body = await res.json();
  const result = body?.chart?.result?.[0];
  if (!result?.timestamp) return null;

  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const points: HistoryPoint[] = [];
  result.timestamp.forEach((t: number, i: number) => {
    const close = closes[i];
    if (typeof close === 'number') {
      points.push({ date: isoDate(new Date(t * 1000)), close });
    }
  });

  if (points.length === 0) return null;
  // Los índices argentinos cotizan en pesos aunque Yahoo no lo declare.
  return { currency: result.meta?.currency || 'ARS', points };
}

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'anonymous';

    try {
      await limiter.check(20, ip);
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { tickers, from } = body as { tickers?: unknown; from?: unknown };

    if (!Array.isArray(tickers)) {
      return NextResponse.json({ error: 'Invalid tickers array' }, { status: 400 });
    }

    const sanitized = tickers
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.trim().toUpperCase())
      .filter((t) => TICKER_PATTERN.test(t))
      .slice(0, 60);

    const fromDate =
      typeof from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(from)
        ? new Date(from)
        : new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);

    const result: Record<string, HistorySeries> = {};
    const now = Date.now();

    await Promise.allSettled(
      sanitized.map(async (ticker) => {
        const cacheKey = `${ticker}|${isoDate(fromDate)}`;
        const cached = CACHE.get(cacheKey);
        if (cached && now - cached.timestamp < CACHE_TTL) {
          result[ticker] = cached.series;
          return;
        }

        // Igual que en /api/prices: sin sufijo se asume BYMA. Un CEDEAR no
        // vale lo mismo que la acción subyacente (NVDA.BA es una fracción de
        // NVDA), así que pedir el ticker pelado infla la valuación.
        const queryTicker =
          ticker.startsWith('^') || ticker.includes('.') ? ticker : `${ticker}.BA`;

        let series: HistorySeries | null = null;

        try {
          const chart = await yahooFinance.chart(queryTicker, {
            period1: fromDate,
            interval: '1d',
          });
          const points: HistoryPoint[] = (chart.quotes ?? [])
            .filter((q) => typeof q.close === 'number' && q.close !== null)
            .map((q) => ({ date: isoDate(new Date(q.date)), close: q.close as number }));
          if (points.length > 0) {
            series = { currency: chart.meta?.currency ?? 'ARS', points };
          }
        } catch {
          // Cae al respaldo directo más abajo.
        }

        if (!series) {
          try {
            series = await fetchChartDirect(queryTicker, fromDate);
          } catch (err) {
            console.warn(`Sin historial para ${ticker}:`, err instanceof Error ? err.message : err);
          }
        }

        if (!series) return;
        result[ticker] = series;
        CACHE.set(cacheKey, { series, timestamp: now });
      })
    );

    if (CACHE.size > 400) CACHE.clear();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en /api/history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
