import { Position, RawOrder } from '../types';
import { orderRateToUSD, sortOrders } from './calculator';
import { FxRates } from './fx';
import { parseOrderDate } from './parser';
import { TimeSeries, parseSeriesDate, startOfDay } from './series';

export interface PriceHistory {
  currency: string;
  series: TimeSeries;
}

export interface TimelinePoint {
  timestamp: number;
  date: string;
  investedUSD: number;
  actualValueUSD: number;
  benchmarkUSD?: number;
  /**
   * Índice time-weighted base 100: encadena el rendimiento diario descontando
   * compras y ventas. El valor bruto sube y baja con los aportes, así que sobre
   * él una caída sólo significa que se retiró plata, no que la cartera perdió.
   */
  twrIndex: number;
}

export interface BuildTimelineArgs {
  orders: RawOrder[];
  positions: Position[];
  fx: FxRates;
  /** Cierres diarios por ticker, en la moneda que los publique el proveedor. */
  history: Map<string, PriceHistory>;
  /** Serie del benchmark, para simular los mismos aportes en otro activo. */
  benchmark?: PriceHistory;
}

const DAY = 24 * 60 * 60 * 1000;
const QTY_EPSILON = 1e-6;

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function priceUsdAt(history: PriceHistory | undefined, timestamp: number, fx: FxRates) {
  if (!history) return undefined;
  const price = history.series.at(timestamp);
  if (price === undefined) return undefined;
  return history.currency === 'ARS' ? price * fx.usdFactorAt(timestamp) : price;
}

/**
 * Precios de respaldo para los instrumentos sin serie de mercado (FCI, ONs
 * locales): se interpola entre los precios a los que el usuario efectivamente
 * operó. Es una aproximación, pero acotada a esos casos.
 */
function tradeAnchors(orders: RawOrder[], fx: FxRates): Map<string, TimeSeries> {
  const byTicker = new Map<string, Map<number, { sum: number; count: number }>>();

  for (const order of orders) {
    const t = startOfDay(parseOrderDate(order.Concertacion));
    const priceUSD = Number(order.Precio) * orderRateToUSD(order, fx);
    if (!(priceUSD > 0)) continue;

    const perDay = byTicker.get(order.Ticker) ?? new Map();
    const bucket = perDay.get(t) ?? { sum: 0, count: 0 };
    bucket.sum += priceUSD;
    bucket.count += 1;
    perDay.set(t, bucket);
    byTicker.set(order.Ticker, perDay);
  }

  const result = new Map<string, TimeSeries>();
  byTicker.forEach((perDay, ticker) => {
    const points = Array.from(perDay.entries()).map(([t, b]) => ({ t, v: b.sum / b.count }));
    result.set(ticker, new TimeSeries(points));
  });
  return result;
}

export function buildTimeline({
  orders,
  positions,
  fx,
  history,
  benchmark,
}: BuildTimelineArgs): TimelinePoint[] {
  const sorted = sortOrders(orders);
  if (sorted.length === 0) return [];

  const anchors = tradeAnchors(sorted, fx);
  const currentPrices = new Map(
    positions
      .filter((p) => p.currentPriceUSD !== undefined)
      .map((p) => [p.ticker, p.currentPriceUSD as number])
  );

  const today = startOfDay(new Date());
  const start = startOfDay(parseOrderDate(sorted[0].Concertacion));

  const holdings = new Map<string, number>();
  const costBasis = new Map<string, number>();
  let cumulativeInvestedUSD = 0;
  let benchmarkUnits = 0;

  const points: TimelinePoint[] = [];
  let index = 0;
  let twrIndex = 100;
  let previousValue = 0;

  for (let t = start; t <= today; t += DAY) {
    let investedDelta = 0;

    while (index < sorted.length) {
      const order = sorted[index];
      const orderDay = startOfDay(parseOrderDate(order.Concertacion));
      if (orderDay > t) break;

      const netoUSD = Number(order.Neto) * orderRateToUSD(order, fx);
      const qty = holdings.get(order.Ticker) ?? 0;

      if (order.Tipo === 'COMPRA') {
        holdings.set(order.Ticker, qty + order.Cantidad);
        costBasis.set(order.Ticker, (costBasis.get(order.Ticker) ?? 0) + netoUSD);
        cumulativeInvestedUSD += netoUSD;
        investedDelta += netoUSD;
      } else if (order.Tipo === 'VENTA') {
        const avg = qty > QTY_EPSILON ? (costBasis.get(order.Ticker) ?? 0) / qty : 0;
        const soldCost = order.Cantidad * avg;
        holdings.set(order.Ticker, qty - order.Cantidad);
        costBasis.set(order.Ticker, (costBasis.get(order.Ticker) ?? 0) - soldCost);
        cumulativeInvestedUSD -= soldCost;
        investedDelta -= soldCost;

        if (Math.abs(holdings.get(order.Ticker) ?? 0) < QTY_EPSILON) {
          holdings.set(order.Ticker, 0);
          costBasis.set(order.Ticker, 0);
        }
      }

      index += 1;
    }

    // El benchmark recibe los mismos aportes netos, en las mismas fechas.
    if (benchmark && investedDelta !== 0) {
      const benchPrice = priceUsdAt(benchmark, t, fx);
      if (benchPrice && benchPrice > 0) {
        benchmarkUnits = Math.max(0, benchmarkUnits + investedDelta / benchPrice);
      }
    }

    let actualValueUSD = 0;
    holdings.forEach((qty, ticker) => {
      if (qty <= QTY_EPSILON) return;
      const marketPrice = priceUsdAt(history.get(ticker), t, fx);
      const price =
        marketPrice ??
        (t >= today ? currentPrices.get(ticker) : undefined) ??
        anchors.get(ticker)?.at(t);
      if (price !== undefined) actualValueUSD += qty * price;
    });

    // El rendimiento del día se mide sobre el valor previo, descontando lo que
    // entró o salió por operaciones de ese mismo día.
    if (previousValue > 0) {
      const growth = (actualValueUSD - investedDelta) / previousValue;
      if (Number.isFinite(growth) && growth > 0) twrIndex *= growth;
    }
    previousValue = actualValueUSD;

    const benchPrice = benchmark ? priceUsdAt(benchmark, t, fx) : undefined;

    points.push({
      timestamp: t,
      date: formatDate(t),
      investedUSD: Math.max(0, cumulativeInvestedUSD),
      actualValueUSD: Math.max(0, actualValueUSD),
      benchmarkUSD: benchPrice ? benchmarkUnits * benchPrice : undefined,
      twrIndex,
    });
  }

  // El último punto usa los valores exactos ya calculados por posición, que
  // incluyen el precio de respaldo de los instrumentos sin cotización.
  const lastPoint = points[points.length - 1];
  if (lastPoint) {
    let exactValue = 0;
    let exactInvested = 0;
    for (const position of positions) {
      exactValue += position.currentValueUSD ?? position.investedValueUSD;
      exactInvested += position.investedValueUSD;
    }
    if (exactValue > 0) lastPoint.actualValueUSD = exactValue;
    if (exactInvested > 0) lastPoint.investedUSD = exactInvested;
  }

  return points;
}

export function historyFromPoints(
  currency: string,
  points: { date: string; close: number }[]
): PriceHistory {
  return {
    currency,
    series: new TimeSeries(points.map((p) => ({ t: parseSeriesDate(p.date), v: p.close }))),
  };
}
