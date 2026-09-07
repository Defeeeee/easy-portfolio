import { describe, expect, it } from 'vitest';
import { TimeSeries, parseSeriesDate, startOfDay } from './series';
import { FxRates, emptyFxRates } from './fx';

const d = (iso: string) => parseSeriesDate(iso);

describe('TimeSeries', () => {
  const serie = new TimeSeries([
    { t: d('2026-01-01'), v: 100 },
    { t: d('2026-01-05'), v: 200 },
    { t: d('2026-01-10'), v: 150 },
  ]);

  it('devuelve el último valor conocido, no interpola', () => {
    expect(serie.at(d('2026-01-03'))).toBe(100);
    expect(serie.at(d('2026-01-05'))).toBe(200);
    expect(serie.at(d('2026-01-09'))).toBe(200);
  });

  it('fuera de rango se queda en los extremos', () => {
    expect(serie.at(d('2025-06-01'))).toBe(100);
    expect(serie.at(d('2030-01-01'))).toBe(150);
  });

  it('interpola linealmente cuando se lo pide', () => {
    expect(serie.interpolatedAt(d('2026-01-03'))).toBeCloseTo(150, 6);
    expect(serie.interpolatedAt(d('2026-01-05'))).toBeCloseTo(200, 6);
  });

  it('ordena los puntos que recibe desordenados', () => {
    const desordenada = new TimeSeries([
      { t: d('2026-01-05'), v: 200 },
      { t: d('2026-01-01'), v: 100 },
    ]);
    expect(desordenada.first?.v).toBe(100);
    expect(desordenada.last?.v).toBe(200);
  });

  it('una serie vacía no rompe', () => {
    const vacia = new TimeSeries([]);
    expect(vacia.isEmpty).toBe(true);
    expect(vacia.at(Date.now())).toBeUndefined();
    expect(vacia.interpolatedAt(Date.now())).toBeUndefined();
  });
});

describe('parseSeriesDate', () => {
  it('lee ambos formatos como fecha local', () => {
    expect(parseSeriesDate('2026-03-15')).toBe(new Date(2026, 2, 15).getTime());
    expect(parseSeriesDate('15-03-2026')).toBe(new Date(2026, 2, 15).getTime());
  });

  it('coincide con startOfDay para la misma fecha', () => {
    expect(parseSeriesDate('2026-03-15')).toBe(startOfDay(new Date(2026, 2, 15, 18, 30)));
  });
});

describe('FxRates', () => {
  const fx = new FxRates(
    [
      { date: '2026-01-01', value: 1000 },
      { date: '2026-06-01', value: 1500 },
    ],
    2000
  );

  it('usa la cotización de la fecha pedida', () => {
    expect(fx.arsPerUsdAt(d('2026-03-01'))).toBe(1000);
    expect(fx.arsPerUsdAt(d('2026-07-01'))).toBe(1500);
  });

  it('el factor es el recíproco', () => {
    expect(fx.usdFactorAt(d('2026-03-01'))).toBeCloseTo(1 / 1000, 10);
  });

  it('sin historia cae en el spot', () => {
    const sinHistoria = emptyFxRates(1800);
    expect(sinHistoria.hasHistory).toBe(false);
    expect(sinHistoria.arsPerUsdAt(Date.now())).toBe(1800);
  });

  it('descarta cotizaciones inválidas', () => {
    const conBasura = new FxRates([{ date: '2026-01-01', value: 0 }], 900);
    expect(conBasura.hasHistory).toBe(false);
  });
});
