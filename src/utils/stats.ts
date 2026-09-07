import {
  CashBalance,
  CashMovement,
  CostBreakdown,
  FiscalYearResult,
  MonthlyActivity,
  PortfolioStats,
  RawOrder,
} from '../types';
import { calculateClosedTrades, isUsdOrder, orderRateToUSD, sortOrders } from './calculator';
import { FxRates } from './fx';
import { parseOrderDate } from './parser';
import { startOfDay } from './series';
import { CashFlow, xirr } from './xirr';

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${month}/${year.slice(2)}`;
}

function costsOf(orders: RawOrder[], fx: FxRates): CostBreakdown {
  let arancelUSD = 0;
  let mercadoUSD = 0;
  let volumeUSD = 0;

  for (const order of orders) {
    const rate = orderRateToUSD(order, fx);
    arancelUSD += Math.abs(Number(order.Arancel) || 0) * rate;
    mercadoUSD += Math.abs(Number(order['Costos Mercado']) || 0) * rate;
    volumeUSD += Math.abs(Number(order.Bruto) || 0) * rate;
  }

  const totalUSD = arancelUSD + mercadoUSD;
  return {
    arancelUSD,
    mercadoUSD,
    totalUSD,
    costRatio: volumeUSD > 0 ? (totalUSD / volumeUSD) * 100 : 0,
  };
}

/**
 * Saldo de la cuenta comprendida como caja: entra lo depositado y lo vendido,
 * sale lo retirado y lo comprado. Se lleva por moneda porque la cuenta tiene
 * las dos y un canje MEP mueve pesos a dólares sin ser un aporte.
 */
export function calculateCashBalance(
  orders: RawOrder[],
  cash: CashMovement[],
  fx: FxRates
): CashBalance {
  let ars = 0;
  let usd = 0;
  let depositsUSD = 0;
  let withdrawalsUSD = 0;
  let dividendsUSD = 0;

  for (const movement of cash) {
    if (movement.currency === 'USD') usd += movement.amount;
    else ars += movement.amount;

    const factor =
      movement.currency === 'USD' ? 1 : fx.usdFactorAt(startOfDay(parseOrderDate(movement.date)));
    const usdAmount = movement.amount * factor;

    if (movement.kind === 'deposit') depositsUSD += usdAmount;
    else if (movement.kind === 'withdrawal') withdrawalsUSD += Math.abs(usdAmount);
    else if (movement.kind === 'dividend') dividendsUSD += usdAmount;
  }

  for (const order of orders) {
    const neto = Math.abs(Number(order.Neto) || 0);
    const signed = order.Tipo === 'VENTA' ? neto : -neto;
    if (isUsdOrder(order)) usd += signed;
    else ars += signed;
  }

  return {
    ars,
    usd,
    totalUSD: usd + ars * fx.usdFactorAt(Date.now()),
    depositsUSD,
    withdrawalsUSD,
    dividendsUSD,
  };
}

/**
 * TIR anualizada de la cuenta: aportes y retiros con su fecha, más el valor de
 * la cartera hoy como flujo final.
 */
export function calculateXirr(
  cash: CashMovement[],
  fx: FxRates,
  currentPortfolioValueUSD: number
): number | null {
  const flows: CashFlow[] = [];

  for (const movement of cash) {
    if (movement.kind !== 'deposit' && movement.kind !== 'withdrawal') continue;
    const t = startOfDay(parseOrderDate(movement.date));
    const factor = movement.currency === 'USD' ? 1 : fx.usdFactorAt(t);
    // Un depósito sale del bolsillo del inversor: flujo negativo.
    flows.push({ t, amount: -movement.amount * factor });
  }

  if (flows.length === 0) return null;
  flows.push({ t: startOfDay(new Date()), amount: currentPortfolioValueUSD });

  return xirr(flows);
}

function fiscalYearsOf(
  orders: RawOrder[],
  fx: FxRates,
  closed: ReturnType<typeof calculateClosedTrades>
): FiscalYearResult[] {
  const map = new Map<number, FiscalYearResult>();

  for (const trade of closed) {
    const year = parseOrderDate(trade.date).getFullYear();
    const bucket = map.get(year) ?? { year, realizedUSD: 0, trades: 0, costsUSD: 0 };
    bucket.realizedUSD += trade.pnlUSD;
    bucket.trades += 1;
    map.set(year, bucket);
  }

  for (const order of orders) {
    const year = parseOrderDate(order.Concertacion).getFullYear();
    const bucket = map.get(year) ?? { year, realizedUSD: 0, trades: 0, costsUSD: 0 };
    const rate = orderRateToUSD(order, fx);
    bucket.costsUSD +=
      (Math.abs(Number(order.Arancel) || 0) + Math.abs(Number(order['Costos Mercado']) || 0)) *
      rate;
    map.set(year, bucket);
  }

  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

export function calculateStats(
  orders: RawOrder[],
  cash: CashMovement[],
  fx: FxRates,
  currentPortfolioValueUSD: number
): PortfolioStats {
  const sorted = sortOrders(orders);
  const closedTrades = calculateClosedTrades(orders, fx);

  const realizedPnlUSD = closedTrades.reduce((sum, t) => sum + t.pnlUSD, 0);
  const realizedCostBasis = closedTrades.reduce((sum, t) => sum + t.costBasisUSD, 0);

  const monthMap = new Map<string, MonthlyActivity>();
  const tickerCount = new Map<string, number>();
  let buyOrders = 0;
  let sellOrders = 0;
  let volumeUSD = 0;

  for (const order of sorted) {
    const date = parseOrderDate(order.Concertacion);
    const key = monthKey(date);
    const netoUSD = Math.abs(Number(order.Neto) || 0) * orderRateToUSD(order, fx);

    const bucket = monthMap.get(key) ?? {
      month: key,
      label: monthLabel(key),
      buysUSD: 0,
      sellsUSD: 0,
      netUSD: 0,
      trades: 0,
    };

    if (order.Tipo === 'VENTA') {
      bucket.sellsUSD += netoUSD;
      sellOrders += 1;
    } else {
      bucket.buysUSD += netoUSD;
      buyOrders += 1;
    }
    bucket.netUSD = bucket.buysUSD - bucket.sellsUSD;
    bucket.trades += 1;
    monthMap.set(key, bucket);

    volumeUSD += netoUSD;
    tickerCount.set(order.Ticker, (tickerCount.get(order.Ticker) ?? 0) + 1);
  }

  const monthly = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  let mostTradedTicker: string | null = null;
  let mostTradedCount = 0;
  tickerCount.forEach((count, ticker) => {
    if (count > mostTradedCount) {
      mostTradedCount = count;
      mostTradedTicker = ticker;
    }
  });

  const firstOrder = sorted[0];
  const lastOrder = sorted[sorted.length - 1];
  const daysActive =
    firstOrder && lastOrder
      ? Math.max(
          1,
          Math.round(
            (parseOrderDate(lastOrder.Concertacion).getTime() -
              parseOrderDate(firstOrder.Concertacion).getTime()) /
              86_400_000
          )
        )
      : 0;

  const cashBalance = calculateCashBalance(orders, cash, fx);

  return {
    realizedPnlUSD,
    realizedPnlPercentage: realizedCostBasis > 0 ? (realizedPnlUSD / realizedCostBasis) * 100 : 0,
    closedTrades,
    costs: costsOf(orders, fx),
    monthly,
    totalOrders: sorted.length,
    buyOrders,
    sellOrders,
    volumeUSD,
    firstDate: firstOrder ? firstOrder.Concertacion : null,
    lastDate: lastOrder ? lastOrder.Concertacion : null,
    daysActive,
    mostTradedTicker,
    cash: cashBalance,
    cashMovements: cash,
    xirr: calculateXirr(cash, fx, currentPortfolioValueUSD + cashBalance.totalUSD),
    fiscalYears: fiscalYearsOf(orders, fx, closedTrades),
  };
}

/** Índice Herfindahl-Hirschman: 0 = diversificado, 10.000 = un solo activo. */
export function concentrationIndex(weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return 0;
  return weights.reduce((sum, w) => {
    const share = (w / total) * 100;
    return sum + share * share;
  }, 0);
}

/** Caída máxima desde un pico previo, en porcentaje. */
export function maxDrawdown(values: number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const value of values) {
    if (value > peak) peak = value;
    if (peak > 0) {
      const drawdown = ((value - peak) / peak) * 100;
      if (drawdown < worst) worst = drawdown;
    }
  }
  return worst;
}
