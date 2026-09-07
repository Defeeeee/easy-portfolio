import { ClosedTrade, Position, PriceSource, RawOrder } from '../types';
import { getAssetType } from './assetTypes';
import { FxRates } from './fx';
import { parseOrderDate } from './parser';
import { startOfDay } from './series';

/** Cero práctico: por debajo de esto una tenencia es ruido de punto flotante. */
const QTY_EPSILON = 1e-6;

export function isUsdOrder(order: RawOrder): boolean {
  const m = order.Moneda?.toLowerCase() ?? '';
  return m.includes('dólar') || m.includes('dolar') || m.includes('dollar') || m.includes('usd');
}

/**
 * Factor para expresar el monto de una orden en dólares. Para las órdenes en
 * pesos usa el MEP **del día de la operación**, no el de hoy.
 */
export function orderRateToUSD(order: RawOrder, fx: FxRates): number {
  if (isUsdOrder(order)) return 1;
  return fx.usdFactorAt(startOfDay(parseOrderDate(order.Concertacion)));
}

/**
 * Ordena cronológicamente y, dentro del mismo día, pone las COMPRAS antes que
 * las VENTAS. Sin este desempate una venta que en el archivo aparece antes que
 * su compra deja la tenencia en cero y la compra posterior la "revive" como una
 * posición fantasma (p. ej. las dos patas de un dólar MEP sobre la misma ON).
 */
export function sortOrders(orders: RawOrder[]): RawOrder[] {
  return [...orders].sort((a, b) => {
    const diff =
      parseOrderDate(a.Concertacion).getTime() - parseOrderDate(b.Concertacion).getTime();
    if (diff !== 0) return diff;
    const rank = (o: RawOrder) => (o.Tipo === 'VENTA' ? 1 : 0);
    return rank(a) - rank(b);
  });
}

interface Lot {
  quantity: number;
  totalCostUSD: number;
  especie: string;
}

/**
 * Recorre las órdenes aplicando costo promedio ponderado y devuelve, para cada
 * ticker, la tenencia viva y las ventas ya cerradas.
 */
function walkOrders(orders: RawOrder[], fx: FxRates) {
  const lots = new Map<string, Lot>();
  const closed: ClosedTrade[] = [];

  for (const order of sortOrders(orders)) {
    const orderNetoUSD = Number(order.Neto) * orderRateToUSD(order, fx);

    const lot = lots.get(order.Ticker) ?? {
      quantity: 0,
      totalCostUSD: 0,
      especie: order.Especie || '',
    };
    if (!lot.especie && order.Especie) lot.especie = order.Especie;

    if (order.Tipo === 'COMPRA') {
      lot.quantity += order.Cantidad;
      lot.totalCostUSD += orderNetoUSD;
    } else if (order.Tipo === 'VENTA') {
      const avgPriceUSD = lot.quantity > QTY_EPSILON ? lot.totalCostUSD / lot.quantity : 0;
      const soldQty = Math.min(order.Cantidad, Math.max(lot.quantity, 0));
      const costBasisUSD = soldQty * avgPriceUSD;

      if (soldQty > QTY_EPSILON) {
        closed.push({
          ticker: order.Ticker,
          especie: lot.especie,
          assetType: getAssetType(lot.especie, order.Ticker),
          date: order.Concertacion,
          quantity: soldQty,
          costBasisUSD,
          proceedsUSD: orderNetoUSD,
          pnlUSD: orderNetoUSD - costBasisUSD,
          pnlPercentage:
            costBasisUSD > 0 ? ((orderNetoUSD - costBasisUSD) / costBasisUSD) * 100 : 0,
        });
      }

      lot.quantity -= order.Cantidad;
      lot.totalCostUSD -= costBasisUSD;

      // Sólo limpiamos ruido de coma flotante: un negativo real significa que al
      // archivo le falta el historial previo y conviene que se note.
      if (Math.abs(lot.quantity) < QTY_EPSILON) {
        lot.quantity = 0;
        lot.totalCostUSD = 0;
      }
    }

    lots.set(order.Ticker, lot);
  }

  return { lots, closed };
}

export function calculatePositions(orders: RawOrder[], fx: FxRates): Position[] {
  const { lots } = walkOrders(orders, fx);

  const positions: Position[] = [];
  lots.forEach((lot, ticker) => {
    if (lot.quantity > QTY_EPSILON) {
      positions.push({
        ticker,
        especie: lot.especie,
        assetType: getAssetType(lot.especie, ticker),
        quantity: lot.quantity,
        averagePrice: lot.totalCostUSD / lot.quantity,
        investedValueUSD: lot.totalCostUSD,
      });
    }
  });

  return positions.sort((a, b) => b.investedValueUSD - a.investedValueUSD);
}

export function calculateClosedTrades(orders: RawOrder[], fx: FxRates): ClosedTrade[] {
  return walkOrders(orders, fx).closed;
}

/**
 * Último precio unitario operado por ticker, en USD. Sirve de respaldo para los
 * instrumentos que no cotizan en el proveedor de precios (FCI, ONs locales).
 */
export function lastTradedPrices(
  orders: RawOrder[],
  fx: FxRates
): Map<string, { priceUSD: number; date: string }> {
  const map = new Map<string, { priceUSD: number; date: string }>();
  for (const order of sortOrders(orders)) {
    const priceUSD = Number(order.Precio) * orderRateToUSD(order, fx);
    if (priceUSD > 0) {
      map.set(order.Ticker, { priceUSD, date: order.Concertacion });
    }
  }
  return map;
}

/** Aplica precios de mercado y, donde no haya, el último precio operado. */
export function enrichPositions(
  positions: Position[],
  quotes: Record<string, { price: number; currency: string }>,
  fallbacks: Map<string, { priceUSD: number; date: string }>,
  spotArsToUsd: number
): Position[] {
  return positions.map((pos) => {
    const quote = quotes[pos.ticker];
    let currentPriceUSD: number | undefined;
    let priceSource: PriceSource | undefined;
    let priceDate: string | undefined;

    if (quote && quote.price > 0) {
      // El precio de mercado es de hoy, así que acá sí corresponde el spot.
      currentPriceUSD =
        quote.currency === 'ARS' && spotArsToUsd > 0 ? quote.price / spotArsToUsd : quote.price;
      priceSource = 'market';
    } else {
      const fallback = fallbacks.get(pos.ticker);
      if (fallback && fallback.priceUSD > 0) {
        currentPriceUSD = fallback.priceUSD;
        priceSource = 'last-trade';
        priceDate = fallback.date;
      }
    }

    if (currentPriceUSD === undefined) return pos;

    const currentValueUSD = pos.quantity * currentPriceUSD;
    const pnlAbsolute = currentValueUSD - pos.investedValueUSD;

    return {
      ...pos,
      currentPriceUSD,
      currentValueUSD,
      pnlAbsolute,
      pnlPercentage: pos.investedValueUSD > 0 ? (pnlAbsolute / pos.investedValueUSD) * 100 : 0,
      priceSource,
      priceDate,
    };
  });
}
