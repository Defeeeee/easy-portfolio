import { describe, expect, it } from 'vitest';
import { buildTimeline, historyFromPoints } from './timeline';
import { calculatePositions, enrichPositions } from './calculator';
import { emptyFxRates } from './fx';
import { RawOrder } from '../types';

const fx = emptyFxRates(1); // 1 ARS = 1 USD: mantiene los números legibles

function buy(id: string, date: string, qty: number, neto: number): RawOrder {
  return {
    id,
    Especie: 'CEDEAR TEST (TEST)',
    'Num Boleto': id,
    Ticker: 'TEST',
    Tipo: 'COMPRA',
    Concertacion: date,
    Liquidacion: date,
    Cantidad: qty,
    Precio: neto / qty,
    Bruto: neto,
    'Costos Mercado': 0,
    Arancel: 0,
    Neto: neto,
    Moneda: 'Dólar',
  };
}

function sell(id: string, date: string, qty: number, neto: number): RawOrder {
  return { ...buy(id, date, qty, neto), Tipo: 'VENTA' };
}

function history(points: [string, number][]) {
  return historyFromPoints(
    'USD',
    points.map(([date, close]) => ({ date, close }))
  );
}

describe('buildTimeline', () => {
  const orders = [buy('1', '2026-01-01', 10, 1000)];
  const positions = calculatePositions(orders, fx);

  it('valúa cada día con el precio de mercado de ese día', () => {
    const hist = new Map([
      [
        'TEST',
        history([
          ['2026-01-01', 100],
          ['2026-01-02', 120],
          ['2026-01-03', 90],
        ]),
      ],
    ]);
    const timeline = buildTimeline({ orders, positions, fx, history: hist });

    expect(timeline[0].actualValueUSD).toBeCloseTo(1000, 4);
    expect(timeline[1].actualValueUSD).toBeCloseTo(1200, 4);
    expect(timeline[0].investedUSD).toBeCloseTo(1000, 4);
  });

  it('arrastra el último cierre en los días sin cotización', () => {
    const hist = new Map([['TEST', history([['2026-01-01', 100]])]]);
    const timeline = buildTimeline({ orders, positions, fx, history: hist });
    expect(timeline[1].actualValueUSD).toBeCloseTo(1000, 4);
  });

  it('interpola con los precios operados cuando no hay serie de mercado', () => {
    const dosOrdenes = [buy('1', '2026-01-01', 10, 1000), buy('2', '2026-01-05', 10, 2000)];
    const timeline = buildTimeline({
      orders: dosOrdenes,
      positions: calculatePositions(dosOrdenes, fx),
      fx,
      history: new Map(),
    });
    // Precio 100 el día 1 y 200 el día 5: al día 3 la interpolación da ~150.
    const dia3 = timeline.find((p) => p.date.startsWith('03/01'));
    expect(dia3?.actualValueUSD).toBeCloseTo(1500, 0);
  });

  describe('índice time-weighted', () => {
    it('no se mueve por un aporte nuevo', () => {
      const conAporte = [buy('1', '2026-01-01', 10, 1000), buy('2', '2026-01-03', 90, 9000)];
      const hist = new Map([['TEST', history([['2026-01-01', 100]])]]);
      const timeline = buildTimeline({
        orders: conAporte,
        positions: calculatePositions(conAporte, fx),
        fx,
        history: hist,
      });
      // El valor bruto se multiplica por 10, pero el rendimiento es 0%.
      expect(timeline[timeline.length - 1].actualValueUSD).toBeGreaterThan(9000);
      expect(timeline[2].twrIndex).toBeCloseTo(100, 4);
    });

    it('no cuenta un retiro como pérdida', () => {
      // Este era el bug: una venta grande se leía como una caída del 87%.
      const conRetiro = [buy('1', '2026-01-01', 100, 10_000), sell('2', '2026-01-03', 95, 9_500)];
      const hist = new Map([['TEST', history([['2026-01-01', 100]])]]);
      const timeline = buildTimeline({
        orders: conRetiro,
        positions: calculatePositions(conRetiro, fx),
        fx,
        history: hist,
      });
      const peor = Math.min(...timeline.map((p) => p.twrIndex));
      expect(peor).toBeCloseTo(100, 2);
    });

    it('sí refleja una caída de precio', () => {
      const hist = new Map([
        [
          'TEST',
          history([
            ['2026-01-01', 100],
            ['2026-01-02', 80],
          ]),
        ],
      ]);
      const timeline = buildTimeline({ orders, positions, fx, history: hist });
      expect(timeline[1].twrIndex).toBeCloseTo(80, 2);
    });
  });

  it('invierte en el benchmark los mismos aportes y en las mismas fechas', () => {
    const hist = new Map([['TEST', history([['2026-01-01', 100]])]]);
    const benchmark = history([
      ['2026-01-01', 10],
      ['2026-01-02', 20],
    ]);
    const timeline = buildTimeline({ orders, positions, fx, history: hist, benchmark });

    // 1000 USD / 10 = 100 unidades; al día siguiente valen 20 cada una.
    expect(timeline[0].benchmarkUSD).toBeCloseTo(1000, 4);
    expect(timeline[1].benchmarkUSD).toBeCloseTo(2000, 4);
  });

  it('cierra el último punto con los valores exactos de cada posición', () => {
    const hist = new Map([['TEST', history([['2026-01-01', 100]])]]);
    const enriched = enrichPositions(
      positions,
      { TEST: { price: 500, currency: 'USD' } },
      new Map(),
      1
    );
    const timeline = buildTimeline({ orders, positions: enriched, fx, history: hist });
    expect(timeline[timeline.length - 1].actualValueUSD).toBeCloseTo(5000, 4);
  });

  it('devuelve vacío sin órdenes', () => {
    expect(buildTimeline({ orders: [], positions: [], fx, history: new Map() })).toEqual([]);
  });
});

describe('flujos de mercado vs costo', () => {
  it('una venta con ganancia no hunde el índice time-weighted', () => {
    // La venta devuelve 1.500 sobre un costo de 1.000: el flujo que sale es el
    // dinero recibido, no la base de costo.
    const ordenes = [buy('1', '2026-01-01', 20, 2000), sell('2', '2026-01-03', 10, 1500)];
    const hist = new Map([['TEST', history([['2026-01-01', 100]])]]);
    const timeline = buildTimeline({
      orders: ordenes,
      positions: calculatePositions(ordenes, fx),
      fx,
      history: hist,
    });
    const peor = Math.min(...timeline.map((p) => p.twrIndex));
    expect(peor).toBeGreaterThan(99.9);
  });

  it('el benchmark vende lo mismo que se cobró, no el costo', () => {
    const ordenes = [buy('1', '2026-01-01', 20, 2000), sell('2', '2026-01-02', 10, 1500)];
    const hist = new Map([['TEST', history([['2026-01-01', 100]])]]);
    const benchmark = history([['2026-01-01', 10]]);
    const timeline = buildTimeline({
      orders: ordenes,
      positions: calculatePositions(ordenes, fx),
      fx,
      history: hist,
      benchmark,
    });
    // 2.000 compran 200 unidades; al cobrar 1.500 se venden 150: quedan 500.
    expect(timeline[1].benchmarkUSD).toBeCloseTo(500, 4);
  });
});
