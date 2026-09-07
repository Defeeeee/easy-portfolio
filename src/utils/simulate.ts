import { Position } from '../types';
import { FxRates } from './fx';
import { PriceHistory } from './timeline';
import { startOfDay } from './series';

export interface SimulationRow {
  /** Fracción del FCI que se mueve al activo destino (0 a 1). */
  share: number;
  movedUSD: number;
  equityWeight: number;
  returnPct: number;
  volatilityPct: number;
  maxDrawdownPct: number;
}

export interface SimulationArgs {
  positions: Position[];
  history: Map<string, PriceHistory>;
  target: PriceHistory;
  fx: FxRates;
  /** Tipos de activo cuya tenencia se considera "movible". */
  sourceAssetType?: string;
  shares?: number[];
  fromDays?: number;
}

const DEFAULT_SHARES = [0, 0.1, 0.25, 0.5, 0.75, 1];

function priceUsdAt(h: PriceHistory, t: number, fx: FxRates): number | undefined {
  const p = h.series.at(t);
  if (p === undefined) return undefined;
  return h.currency === 'ARS' ? p * fx.usdFactorAt(t) : p;
}

/**
 * Reconstruye el valor diario de la cartera actual como si una fracción del
 * activo de origen hubiera estado, durante todo el período, en el activo
 * destino. Es un contrafáctico sobre las tenencias de hoy: no reproduce las
 * compras y ventas que hubo en el medio.
 */
export function simulateAllocation({
  positions,
  history,
  target,
  fx,
  sourceAssetType = 'Fondo Común',
  shares = DEFAULT_SHARES,
  fromDays = 365,
}: SimulationArgs): SimulationRow[] {
  const today = startOfDay(new Date());
  const from = today - fromDays * 24 * 60 * 60 * 1000;

  const movable = positions.filter((p) => p.assetType === sourceAssetType);
  const held = positions.filter((p) => p.assetType !== sourceAssetType && history.has(p.ticker));

  const movableUSD = movable.reduce((sum, p) => sum + (p.currentValueUSD ?? p.investedValueUSD), 0);
  const heldUSD = held.reduce((sum, p) => sum + (p.currentValueUSD ?? p.investedValueUSD), 0);
  const totalUSD = movableUSD + heldUSD;
  if (totalUSD <= 0 || movableUSD <= 0) return [];

  // Días con cotización para todas las series involucradas.
  const days: number[] = [];
  for (let t = from; t <= today; t += 24 * 60 * 60 * 1000) {
    const ok =
      priceUsdAt(target, t, fx) !== undefined &&
      held.every((p) => priceUsdAt(history.get(p.ticker) as PriceHistory, t, fx) !== undefined);
    if (ok) days.push(t);
  }
  if (days.length < 30) return [];

  const targetToday = priceUsdAt(target, today, fx) as number;
  const unitsHeld = held.map((p) => {
    const priceToday = priceUsdAt(history.get(p.ticker) as PriceHistory, today, fx) as number;
    const value = p.currentValueUSD ?? p.investedValueUSD;
    return { ticker: p.ticker, units: priceToday > 0 ? value / priceToday : 0 };
  });

  return shares.map((share) => {
    const movedUSD = movableUSD * share;
    const stayingUSD = movableUSD - movedUSD;
    const targetUnits = targetToday > 0 ? movedUSD / targetToday : 0;

    const values = days.map((t) => {
      let v = stayingUSD; // el money market se toma plano en dólares
      for (const h of unitsHeld) {
        v += h.units * (priceUsdAt(history.get(h.ticker) as PriceHistory, t, fx) as number);
      }
      v += targetUnits * (priceUsdAt(target, t, fx) as number);
      return v;
    });

    const rets: number[] = [];
    for (let i = 1; i < values.length; i++) rets.push(values[i] / values[i - 1] - 1);

    const mean = rets.reduce((s, r) => s + r, 0) / (rets.length || 1);
    const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length || 1);
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

    let peak = -Infinity;
    let mdd = 0;
    for (const v of values) {
      if (v > peak) peak = v;
      if (peak > 0) mdd = Math.min(mdd, ((v - peak) / peak) * 100);
    }

    return {
      share,
      movedUSD,
      equityWeight: ((heldUSD + movedUSD) / totalUSD) * 100,
      returnPct: values.length > 1 ? (values[values.length - 1] / values[0] - 1) * 100 : 0,
      volatilityPct: volatility,
      maxDrawdownPct: mdd,
    };
  });
}

export interface RebalanceAction {
  ticker: string;
  currentWeight: number;
  targetWeight: number;
  deltaUSD: number;
}

/** Qué comprar y vender para llegar a los pesos objetivo. */
export function rebalance(
  positions: Position[],
  targets: Record<string, number>
): RebalanceAction[] {
  const values = positions.map((p) => ({
    ticker: p.ticker,
    value: p.currentValueUSD ?? p.investedValueUSD,
  }));
  const total = values.reduce((sum, v) => sum + v.value, 0);
  if (total <= 0) return [];

  return values
    .map(({ ticker, value }) => {
      const currentWeight = (value / total) * 100;
      const targetWeight = targets[ticker] ?? currentWeight;
      return {
        ticker,
        currentWeight,
        targetWeight,
        deltaUSD: (targetWeight / 100) * total - value,
      };
    })
    .sort((a, b) => Math.abs(b.deltaUSD) - Math.abs(a.deltaUSD));
}
