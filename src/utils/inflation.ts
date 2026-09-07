import { TimeSeries, parseSeriesDate } from './series';

export interface InflationPoint {
  date: string;
  /** Variación mensual del IPC, en porcentaje. */
  monthly: number;
}

/**
 * Índice de precios encadenado a partir de las variaciones mensuales. Permite
 * expresar un rendimiento en pesos constantes: en Argentina un +22% nominal
 * puede ser una pérdida real.
 */
export function buildCpiIndex(points: InflationPoint[]): TimeSeries {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  let index = 100;
  const series = sorted.map((p) => {
    index *= 1 + p.monthly / 100;
    return { t: parseSeriesDate(p.date), v: index };
  });
  return new TimeSeries(series);
}

/**
 * Convierte un rendimiento nominal en pesos a rendimiento real, descontando la
 * inflación del mismo período. Devuelve `null` si el índice no cubre el rango.
 */
export function realReturn(
  nominalPct: number,
  from: number,
  to: number,
  cpi: TimeSeries
): number | null {
  const start = cpi.at(from);
  const end = cpi.at(to);
  if (!start || !end || start <= 0) return null;
  const inflation = end / start;
  if (inflation <= 0) return null;
  return ((1 + nominalPct / 100) / inflation - 1) * 100;
}

/** Inflación acumulada entre dos fechas, en porcentaje. */
export function accumulatedInflation(from: number, to: number, cpi: TimeSeries): number | null {
  const start = cpi.at(from);
  const end = cpi.at(to);
  if (!start || !end || start <= 0) return null;
  return (end / start - 1) * 100;
}
