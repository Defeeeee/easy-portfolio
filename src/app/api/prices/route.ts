import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { limiter } from '@/utils/rateLimit';

const yahooFinance = new YahooFinance();

// Los índices llevan acento circunflejo (^MERV), no sólo letras y puntos.
const TICKER_PATTERN = /^\^?[A-Z0-9.]{1,20}$/;

const PRICE_CACHE = new Map<string, { price: number; currency: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'anonymous';

    try {
      // 20 requests per minute per IP
      await limiter.check(20, ip);
    } catch (e) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { tickers } = body;

    if (!tickers || !Array.isArray(tickers)) {
      return NextResponse.json({ error: 'Invalid tickers array' }, { status: 400 });
    }

    if (tickers.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 tickers allowed per request' },
        { status: 400 }
      );
    }

    const sanitizedTickers = tickers
      .filter((t) => typeof t === 'string')
      .map((t) => t.trim().toUpperCase())
      .filter((t) => TICKER_PATTERN.test(t))
      .slice(0, 100);

    const pricesMap: Record<string, { price: number; currency: string }> = {};
    const tickersToFetch: string[] = [];

    const now = Date.now();
    for (const ticker of sanitizedTickers) {
      const cached = PRICE_CACHE.get(ticker);
      if (cached && now - cached.timestamp < CACHE_TTL) {
        pricesMap[ticker] = { price: cached.price, currency: cached.currency };
      } else {
        tickersToFetch.push(ticker);
      }
    }

    if (tickersToFetch.length > 0) {
      await Promise.allSettled(
        tickersToFetch.map(async (ticker: string) => {
          try {
            const queryTicker = ticker.includes('.') ? ticker : `${ticker}.BA`;
            const quote = await yahooFinance.quote(queryTicker);

            if (quote && quote.regularMarketPrice && quote.currency) {
              const priceData = {
                price: quote.regularMarketPrice,
                currency: quote.currency,
              };
              pricesMap[ticker] = priceData;
              PRICE_CACHE.set(ticker, { ...priceData, timestamp: now });
            }
          } catch (err: any) {
            console.warn(`Could not fetch quote for ${ticker}:`, err.message || err);
          }
        })
      );
    }

    if (PRICE_CACHE.size > 1000) {
      PRICE_CACHE.clear();
    }

    return NextResponse.json(pricesMap);
  } catch (error) {
    console.error('Error processing request in prices route:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
