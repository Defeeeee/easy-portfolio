import { BrokerType } from '@/constants/brokers';
import { BENCHMARKS } from '@/constants/benchmarks';
import { CashMovement, ParsedFile, PortfolioStats, Position, RawOrder } from '../types';
import {
  fetchCurrentPrices,
  fetchDolarRate,
  fetchFundQuotes,
  fetchInflation,
  fetchMepSeries,
  fetchPriceHistory,
} from './api';
import { FundPrice, calculatePositions, enrichPositions, lastTradedPrices } from './calculator';
import { detectBroker } from './brokerDetect';
import { matchFund } from './fciMatch';
import { FxRates } from './fx';
import { mergeParsedFiles, parseBalanz, parseCocos, parseOrderDate } from './parser';
import { calculateStats } from './stats';
import { PriceHistory, flatUsdHistory, historyFromPoints } from './timeline';

export interface InflationPoint {
  date: string;
  monthly: number;
}

export interface PortfolioModel {
  orders: RawOrder[];
  cash: CashMovement[];
  positions: Position[];
  stats: PortfolioStats;
  fx: FxRates;
  history: Map<string, PriceHistory>;
  benchmarks: Map<string, PriceHistory>;
  inflation: InflationPoint[];
  arsToUsdRate: number;
  hasFxHistory: boolean;
  estimatedTickers: string[];
  duplicatesSkipped: number;
  brokersDetected: BrokerType[];
}

const PARSERS: Record<BrokerType, (file: File) => Promise<ParsedFile>> = {
  cocos: parseCocos,
  balanz: parseBalanz,
};

/**
 * Parsea cada archivo con el parser que le corresponde, deduciendo el broker de
 * su cabecera. Permite mezclar exports de brokers distintos en una sola cartera.
 */
export async function parseFiles(
  files: File[],
  fallbackBroker: BrokerType
): Promise<ParsedFile & { duplicates: number; brokers: BrokerType[] }> {
  const brokers: BrokerType[] = [];

  const parsed = await Promise.all(
    files.map(async (file) => {
      const broker = (await detectBroker(file)) ?? fallbackBroker;
      if (!brokers.includes(broker)) brokers.push(broker);
      return PARSERS[broker](file);
    })
  );

  return { ...mergeParsedFiles(parsed), brokers };
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Traduce el VCP publicado de cada fondo a precio por unidad, en dólares. */
function fundPricesFor(
  positions: Position[],
  funds: Awaited<ReturnType<typeof fetchFundQuotes>>,
  spotRate: number
): Map<string, FundPrice> {
  const result = new Map<string, FundPrice>();
  if (funds.length === 0) return result;

  for (const position of positions) {
    if (position.assetType !== 'Fondo Común') continue;

    const match = matchFund(position.especie, funds);
    if (!match) continue;

    // El VCP viene en la misma unidad que la columna de precio del broker.
    const unitPrice = match.vcp / (position.priceScale ?? 1);
    const priceUSD = position.currency === 'USD' ? unitPrice : unitPrice / spotRate;
    if (priceUSD > 0) {
      result.set(position.ticker, { priceUSD, fondo: match.fondo, fecha: match.fecha });
    }
  }

  return result;
}

export async function buildPortfolio(
  orders: RawOrder[],
  cash: CashMovement[],
  duplicatesSkipped = 0,
  brokersDetected: BrokerType[] = []
): Promise<PortfolioModel> {
  const [spotRate, mepPoints, funds, inflation] = await Promise.all([
    fetchDolarRate(),
    fetchMepSeries(),
    fetchFundQuotes(),
    fetchInflation(),
  ]);

  const fx = new FxRates(mepPoints, spotRate);
  const positions = calculatePositions(orders, fx);
  const tickers = positions.map((p) => p.ticker);

  const firstDate = orders.reduce<Date | null>((earliest, order) => {
    const d = parseOrderDate(order.Concertacion);
    return !earliest || d < earliest ? d : earliest;
  }, null);

  const benchmarkTickers = BENCHMARKS.map((b) => b.ticker).filter((t): t is string => t !== null);

  const [quotes, historyRaw] = await Promise.all([
    fetchCurrentPrices(tickers),
    fetchPriceHistory([...tickers, ...benchmarkTickers], firstDate ? isoDay(firstDate) : undefined),
  ]);

  const enriched = enrichPositions(
    positions,
    quotes,
    lastTradedPrices(orders, fx),
    spotRate,
    fundPricesFor(positions, funds, spotRate)
  );

  const history = new Map<string, PriceHistory>();
  for (const [ticker, series] of Object.entries(historyRaw)) {
    if (benchmarkTickers.includes(ticker)) continue;
    history.set(ticker, historyFromPoints(series.currency, series.points));
  }

  const benchmarks = new Map<string, PriceHistory>();
  for (const option of BENCHMARKS) {
    if (option.ticker === null) {
      benchmarks.set(option.key, flatUsdHistory());
      continue;
    }
    const raw = historyRaw[option.ticker];
    if (raw) benchmarks.set(option.key, historyFromPoints(raw.currency, raw.points));
  }

  const currentValueUSD = enriched.reduce(
    (sum, p) => sum + (p.currentValueUSD ?? p.investedValueUSD),
    0
  );

  return {
    orders,
    cash,
    positions: enriched,
    stats: calculateStats(orders, cash, fx, currentValueUSD),
    fx,
    history,
    benchmarks,
    inflation,
    arsToUsdRate: spotRate,
    hasFxHistory: fx.hasHistory,
    estimatedTickers: enriched.filter((p) => p.priceSource === 'last-trade').map((p) => p.ticker),
    duplicatesSkipped,
    brokersDetected,
  };
}
