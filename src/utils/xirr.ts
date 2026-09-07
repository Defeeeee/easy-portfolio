export interface CashFlow {
  /** Timestamp del flujo. */
  t: number;
  /** Negativo lo que se aporta, positivo lo que se recibe. */
  amount: number;
}

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

function npv(flows: CashFlow[], rate: number, t0: number): number {
  return flows.reduce((sum, f) => {
    const years = (f.t - t0) / MS_PER_YEAR;
    return sum + f.amount / Math.pow(1 + rate, years);
  }, 0);
}

/**
 * Tasa interna de retorno para flujos en fechas arbitrarias (equivalente al
 * XIRR de las planillas). A diferencia de `(valor - costo) / costo`, pondera
 * *cuándo* entró cada peso: un aporte de la semana pasada no pesa lo mismo que
 * uno de hace un año.
 *
 * Resuelve por bisección sobre (-0,9999, 100]: es más lenta que Newton pero no
 * diverge, que con flujos irregulares pasa seguido. Devuelve la tasa anual o
 * `null` si no hay un cambio de signo que garantice solución.
 */
export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;

  const hasPositive = flows.some((f) => f.amount > 0);
  const hasNegative = flows.some((f) => f.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const sorted = [...flows].sort((a, b) => a.t - b.t);
  const t0 = sorted[0].t;
  if (sorted[sorted.length - 1].t === t0) return null;

  let lo = -0.9999;
  let hi = 100;
  let npvLo = npv(sorted, lo, t0);
  let npvHi = npv(sorted, hi, t0);

  if (!Number.isFinite(npvLo) || !Number.isFinite(npvHi)) return null;
  if (npvLo * npvHi > 0) return null;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const npvMid = npv(sorted, mid, t0);
    if (!Number.isFinite(npvMid)) return null;
    if (Math.abs(npvMid) < 1e-9) return mid;

    if (npvLo * npvMid <= 0) {
      hi = mid;
      npvHi = npvMid;
    } else {
      lo = mid;
      npvLo = npvMid;
    }
  }

  const result = (lo + hi) / 2;
  return Number.isFinite(result) ? result : null;
}
