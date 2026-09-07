/** Un punto de una serie diaria: timestamp a medianoche local y su valor. */
export interface SeriesPoint {
  t: number;
  v: number;
}

/**
 * Serie temporal ordenada con búsqueda del último valor conocido. Las series de
 * mercado tienen huecos (fines de semana, feriados), así que consultar una
 * fecha devuelve la última cotización previa, no una interpolación.
 */
export class TimeSeries {
  private readonly points: SeriesPoint[];

  constructor(points: SeriesPoint[]) {
    this.points = [...points].sort((a, b) => a.t - b.t);
  }

  get isEmpty(): boolean {
    return this.points.length === 0;
  }

  get first(): SeriesPoint | undefined {
    return this.points[0];
  }

  get last(): SeriesPoint | undefined {
    return this.points[this.points.length - 1];
  }

  /** Índice del último punto con fecha <= timestamp. */
  private indexAt(timestamp: number): number {
    let lo = 0;
    let hi = this.points.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (this.points[mid].t <= timestamp) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  /**
   * Valor interpolado linealmente entre los dos puntos que rodean la fecha.
   * Para una serie que devenga todos los días (un money market, por ejemplo)
   * la recta se acerca mucho más que el escalón de `at`.
   */
  interpolatedAt(timestamp: number): number | undefined {
    if (this.points.length === 0) return undefined;
    if (timestamp <= this.points[0].t) return this.points[0].v;
    const last = this.points[this.points.length - 1];
    if (timestamp >= last.t) return last.v;

    const i = this.indexAt(timestamp);
    const a = this.points[i];
    const b = this.points[i + 1];
    if (!b || b.t === a.t) return a.v;
    return a.v + ((timestamp - a.t) / (b.t - a.t)) * (b.v - a.v);
  }

  /** Último valor con fecha <= timestamp. Antes del inicio devuelve el primero. */
  at(timestamp: number): number | undefined {
    if (this.points.length === 0) return undefined;
    if (timestamp <= this.points[0].t) return this.points[0].v;
    if (timestamp >= this.points[this.points.length - 1].t) {
      return this.points[this.points.length - 1].v;
    }
    return this.points[this.indexAt(timestamp)].v;
  }
}

export function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

/** "yyyy-mm-dd" o "dd-mm-yyyy" -> timestamp local a medianoche. */
export function parseSeriesDate(value: string): number {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  const dmy = value.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])).getTime();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? Date.now() : startOfDay(parsed);
}
