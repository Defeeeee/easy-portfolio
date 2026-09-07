import { BrokerType } from '@/constants/brokers';
import { CashMovement, ParsedFile, PortfolioStats, Position, RawOrder } from '../types';
import { fetchCurrentPrices, fetchDolarRate, fetchMepSeries, fetchPriceHistory } from './api';
import { calculatePositions, enrichPositions, lastTradedPrices } from './calculator';
import { FxRates } from './fx';
import {
  parseBalanz,
  parseBullMarket,
  parseCocos,
  mergeParsedFiles,
  parseOrderDate,
} from './parser';
import { calculateStats } from './stats';
import { PriceHistory, TimelinePoint, buildTimeline, historyFromPoints } from './timeline';

/** CEDEAR del S&P 500 en BYMA: cotiza en pesos y tiene serie diaria en Yahoo. */
export const BENCHMARK_TICKER = 'SPY.BA';
export const BENCHMARK_LABEL = 'S&P 500';

export interface PortfolioModel {
  orders: RawOrder[];
  cash: CashMovement[];
  positions: Position[];
  stats: PortfolioStats;
  timeline: TimelinePoint[];
  arsToUsdRate: number;
  hasFxHistory: boolean;
  estimatedTickers: string[];
  duplicatesSkipped: number;
}

export async function parseFiles(
  files: File[],
  broker: BrokerType
): Promise<ParsedFile & { duplicates: number }> {
  const parser =
    broker === 'cocos' ? parseCocos : broker === 'balanz' ? parseBalanz : parseBullMarket;
  const parsed = await Promise.all(files.map((file) => parser(file)));
  return mergeParsedFiles(parsed);
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Arma el modelo completo a partir de las órdenes ya parseadas: cotización
 * histórica del dólar, precios de mercado, series diarias y benchmark.
 */
export async function buildPortfolio(
  orders: RawOrder[],
  cash: CashMovement[],
  duplicatesSkipped = 0
): Promise<PortfolioModel> {
  const [spotRate, mepPoints] = await Promise.all([fetchDolarRate(), fetchMepSeries()]);
  const fx = new FxRates(mepPoints, spotRate);

  const positions = calculatePositions(orders, fx);
  const tickers = positions.map((p) => p.ticker);

  const firstDate = orders.reduce<Date | null>((earliest, order) => {
    const d = parseOrderDate(order.Concertacion);
    return !earliest || d < earliest ? d : earliest;
  }, null);

  const [quotes, historyRaw] = await Promise.all([
    fetchCurrentPrices(tickers),
    fetchPriceHistory([...tickers, BENCHMARK_TICKER], firstDate ? isoDay(firstDate) : undefined),
  ]);

  const enriched = enrichPositions(positions, quotes, lastTradedPrices(orders, fx), spotRate);

  const history = new Map<string, PriceHistory>();
  for (const [ticker, series] of Object.entries(historyRaw)) {
    if (ticker === BENCHMARK_TICKER) continue;
    history.set(ticker, historyFromPoints(series.currency, series.points));
  }
  const benchmarkRaw = historyRaw[BENCHMARK_TICKER];
  const benchmark = benchmarkRaw
    ? historyFromPoints(benchmarkRaw.currency, benchmarkRaw.points)
    : undefined;

  const timeline = buildTimeline({ orders, positions: enriched, fx, history, benchmark });

  const currentValueUSD = enriched.reduce(
    (sum, p) => sum + (p.currentValueUSD ?? p.investedValueUSD),
    0
  );

  return {
    orders,
    cash,
    positions: enriched,
    stats: calculateStats(orders, cash, fx, currentValueUSD),
    timeline,
    arsToUsdRate: spotRate,
    hasFxHistory: fx.hasHistory,
    estimatedTickers: enriched.filter((p) => !history.has(p.ticker)).map((p) => p.ticker),
    duplicatesSkipped,
  };
}
