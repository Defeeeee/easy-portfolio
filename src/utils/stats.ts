import { CostBreakdown, MonthlyActivity, PortfolioStats, RawOrder } from '../types';
import { calculateClosedTrades, orderRateToUSD, sortOrders } from './calculator';
import { parseOrderDate } from './parser';

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${month}/${year.slice(2)}`;
}

function costsOf(orders: RawOrder[], arsToUsdRate: number): CostBreakdown {
  let arancelUSD = 0;
  let mercadoUSD = 0;
  let volumeUSD = 0;

  for (const order of orders) {
    const rate = orderRateToUSD(order, arsToUsdRate);
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

export function calculateStats(orders: RawOrder[], arsToUsdRate: number): PortfolioStats {
  const sorted = sortOrders(orders);
  const closedTrades = calculateClosedTrades(orders, arsToUsdRate);

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
    const rate = orderRateToUSD(order, arsToUsdRate);
    const netoUSD = Math.abs(Number(order.Neto) || 0) * rate;

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
  const firstDate = firstOrder ? firstOrder.Concertacion : null;
  const lastDate = lastOrder ? lastOrder.Concertacion : null;
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

  return {
    realizedPnlUSD,
    realizedPnlPercentage: realizedCostBasis > 0 ? (realizedPnlUSD / realizedCostBasis) * 100 : 0,
    closedTrades,
    costs: costsOf(orders, arsToUsdRate),
    monthly,
    totalOrders: sorted.length,
    buyOrders,
    sellOrders,
    volumeUSD,
    firstDate,
    lastDate,
    daysActive,
    mostTradedTicker,
  };
}
