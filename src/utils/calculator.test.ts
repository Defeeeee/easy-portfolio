import { describe, expect, it } from 'vitest';
import {
  calculateClosedTrades,
  calculatePositions,
  enrichPositions,
  lastTradedPrices,
  orderRateToUSD,
  sortOrders,
} from './calculator';
import { FxRates, emptyFxRates } from './fx';
import { parseCocosText } from './parser';
import { RawOrder } from '../types';
import { CEDEAR_BUY, FCI_SUBSCRIPTION, ON_BUY_USD, ON_SELL_ARS, csv } from './__fixtures__/cocos';

const flat = emptyFxRates(1000);

function order(partial: Partial<RawOrder> & { id: string }): RawOrder {
  return {
    Especie: 'CEDEAR TEST (TEST)',
    'Num Boleto': partial.id,
    Ticker: 'TEST',
    Tipo: 'COMPRA',
    Concertacion: '2026-01-01',
    Liquidacion: '2026-01-01',
    Cantidad: 1,
    Precio: 100,
    Bruto: 100,
    'Costos Mercado': 0,
    Arancel: 0,
    Neto: 100,
    Moneda: 'Pesos',
    ...partial,
  };
}

describe('sortOrders', () => {
  it('pone las compras antes que las ventas del mismo día', () => {
    const sorted = sortOrders([
      order({ id: 'v', Tipo: 'VENTA' }),
      order({ id: 'c', Tipo: 'COMPRA' }),
    ]);
    expect(sorted.map((o) => o.id)).toEqual(['c', 'v']);
  });

  it('respeta el orden cronológico entre días distintos', () => {
    const sorted = sortOrders([
      order({ id: 'b', Concertacion: '2026-02-01', Tipo: 'COMPRA' }),
      order({ id: 'a', Concertacion: '2026-01-01', Tipo: 'VENTA' }),
    ]);
    expect(sorted.map((o) => o.id)).toEqual(['a', 'b']);
  });
});

describe('calculatePositions', () => {
  it('no deja posición fantasma cuando la venta viene antes que la compra', () => {
    // Las dos patas de un dólar MEP sobre la misma ON: netean cero.
    const { orders } = parseCocosText(csv(ON_SELL_ARS, ON_BUY_USD));
    const positions = calculatePositions(orders, flat);
    expect(positions.find((p) => p.ticker === 'T661O')).toBeUndefined();
  });

  it('acumula cantidad y costo de las compras', () => {
    const positions = calculatePositions(
      [order({ id: '1', Cantidad: 2, Neto: 200 }), order({ id: '2', Cantidad: 3, Neto: 360 })],
      flat
    );
    expect(positions[0].quantity).toBe(5);
    expect(positions[0].investedValueUSD).toBeCloseTo(0.56, 6); // 560 ARS / 1000
  });

  it('descuenta la venta al costo promedio ponderado', () => {
    const positions = calculatePositions(
      [
        order({ id: '1', Cantidad: 10, Neto: 1000 }),
        order({ id: '2', Cantidad: 10, Neto: 3000 }),
        order({ id: '3', Cantidad: 10, Neto: 5000, Tipo: 'VENTA' }),
      ],
      flat
    );
    // Promedio 200/u: quedan 10 unidades a 200 = 2000 ARS = 2 USD.
    expect(positions[0].quantity).toBe(10);
    expect(positions[0].investedValueUSD).toBeCloseTo(2, 6);
  });

  it('clasifica el tipo de activo a partir de la especie', () => {
    const { orders } = parseCocosText(csv(FCI_SUBSCRIPTION, CEDEAR_BUY));
    const byTicker = Object.fromEntries(
      calculatePositions(orders, flat).map((p) => [p.ticker, p.assetType])
    );
    expect(byTicker.COCOSPPA).toBe('Fondo Común');
    expect(byTicker.PLTR).toBe('CEDEAR');
  });
});

describe('orderRateToUSD', () => {
  const fx = new FxRates(
    [
      { date: '2026-01-01', value: 1000 },
      { date: '2026-06-01', value: 2000 },
    ],
    3000
  );

  it('usa el MEP de la fecha de la operación, no el de hoy', () => {
    expect(orderRateToUSD(order({ id: 'a', Concertacion: '2026-01-15' }), fx)).toBeCloseTo(
      1 / 1000
    );
    expect(orderRateToUSD(order({ id: 'b', Concertacion: '2026-07-15' }), fx)).toBeCloseTo(
      1 / 2000
    );
  });

  it('no convierte las operaciones que ya están en dólares', () => {
    expect(orderRateToUSD(order({ id: 'u', Moneda: 'Dólar' }), fx)).toBe(1);
  });

  it('cae en la cotización spot cuando no hay serie histórica', () => {
    expect(orderRateToUSD(order({ id: 'a' }), emptyFxRates(1500))).toBeCloseTo(1 / 1500);
  });
});

describe('calculateClosedTrades', () => {
  it('calcula el resultado realizado contra el costo promedio', () => {
    const trades = calculateClosedTrades(
      [
        order({ id: '1', Cantidad: 10, Neto: 1000 }),
        order({ id: '2', Cantidad: 5, Neto: 750, Tipo: 'VENTA', Concertacion: '2026-02-01' }),
      ],
      flat
    );
    expect(trades).toHaveLength(1);
    expect(trades[0].costBasisUSD).toBeCloseTo(0.5, 6); // 5 × 100 ARS
    expect(trades[0].proceedsUSD).toBeCloseTo(0.75, 6);
    expect(trades[0].pnlUSD).toBeCloseTo(0.25, 6);
    expect(trades[0].pnlPercentage).toBeCloseTo(50, 4);
  });

  it('ignora ventas sin tenencia previa en vez de inventar ganancia', () => {
    const trades = calculateClosedTrades(
      [order({ id: 'v', Tipo: 'VENTA', Cantidad: 5, Neto: 500 })],
      flat
    );
    expect(trades).toHaveLength(0);
  });
});

describe('enrichPositions', () => {
  const base = calculatePositions([order({ id: '1', Cantidad: 10, Neto: 1000 })], flat);

  it('convierte a dólares una cotización en pesos', () => {
    const [pos] = enrichPositions(base, { TEST: { price: 200, currency: 'ARS' } }, new Map(), 1000);
    expect(pos.currentPriceUSD).toBeCloseTo(0.2, 6);
    expect(pos.currentValueUSD).toBeCloseTo(2, 6);
    expect(pos.priceSource).toBe('market');
  });

  it('usa el último precio operado cuando no hay cotización', () => {
    const fallbacks = new Map([['TEST', { priceUSD: 0.15, date: '2026-01-01' }]]);
    const [pos] = enrichPositions(base, {}, fallbacks, 1000);
    expect(pos.currentValueUSD).toBeCloseTo(1.5, 6);
    expect(pos.priceSource).toBe('last-trade');
    expect(pos.priceDate).toBe('2026-01-01');
  });

  it('deja la posición sin valuar si no hay ningún precio', () => {
    const [pos] = enrichPositions(base, {}, new Map(), 1000);
    expect(pos.currentValueUSD).toBeUndefined();
    expect(pos.pnlAbsolute).toBeUndefined();
  });
});

describe('lastTradedPrices', () => {
  it('se queda con el precio de la operación más reciente', () => {
    const prices = lastTradedPrices(
      [
        order({ id: '1', Precio: 100, Concertacion: '2026-01-01' }),
        order({ id: '2', Precio: 300, Concertacion: '2026-03-01' }),
      ],
      flat
    );
    expect(prices.get('TEST')?.priceUSD).toBeCloseTo(0.3, 6);
    expect(prices.get('TEST')?.date).toBe('2026-03-01');
  });
});
