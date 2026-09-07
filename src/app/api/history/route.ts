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

const TICKER_PATTERN = /^[A-Z0-9.]{1,20}$/;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
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

        try {
          // Igual que en /api/prices: sin sufijo se asume BYMA. Un CEDEAR no
          // vale lo mismo que la acción subyacente (NVDA.BA es una fracción de
          // NVDA), así que pedir el ticker pelado infla la valuación.
          const queryTicker = ticker.includes('.') ? ticker : `${ticker}.BA`;
          const chart = await yahooFinance.chart(queryTicker, {
            period1: fromDate,
            interval: '1d',
          });

          const points: HistoryPoint[] = (chart.quotes ?? [])
            .filter((q) => typeof q.close === 'number' && q.close !== null)
            .map((q) => ({ date: isoDate(new Date(q.date)), close: q.close as number }));

          if (points.length === 0) return;

          const series: HistorySeries = {
            currency: chart.meta?.currency ?? 'ARS',
            points,
          };
          result[ticker] = series;
          CACHE.set(cacheKey, { series, timestamp: now });
        } catch (err) {
          console.warn(`Sin historial para ${ticker}:`, err instanceof Error ? err.message : err);
        }
      })
    );

    if (CACHE.size > 400) CACHE.clear();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en /api/history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
