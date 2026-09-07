import { TimeSeries, parseSeriesDate } from './series';

export interface MepPoint {
  date: string;
  value: number;
}

/**
 * Convierte pesos a dólares usando el MEP **de la fecha de cada operación**.
 * Cuando no hay serie histórica cae en la cotización spot, que es el
 * comportamiento anterior.
 */
export class FxRates {
  private readonly series: TimeSeries;

  constructor(
    points: MepPoint[],
    readonly spot: number
  ) {
    this.series = new TimeSeries(
      points.filter((p) => p.value > 0).map((p) => ({ t: parseSeriesDate(p.date), v: p.value }))
    );
  }

  get hasHistory(): boolean {
    return !this.series.isEmpty;
  }

  /** Pesos por dólar en esa fecha. */
  arsPerUsdAt(timestamp: number): number {
    return this.series.at(timestamp) ?? this.spot;
  }

  /** Factor para pasar un monto en pesos de esa fecha a dólares. */
  usdFactorAt(timestamp: number): number {
    const rate = this.arsPerUsdAt(timestamp);
    return rate > 0 ? 1 / rate : 0;
  }

  seriesForChart(): TimeSeries {
    return this.series;
  }
}

export function emptyFxRates(spot: number): FxRates {
  return new FxRates([], spot);
}
