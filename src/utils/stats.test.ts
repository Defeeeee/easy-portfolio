import { describe, expect, it } from 'vitest';
import { calculateCashBalance, calculateStats, concentrationIndex, maxDrawdown } from './stats';
import { emptyFxRates } from './fx';
import { parseCocosText } from './parser';
import { CASH_DEPOSIT, CASH_WITHDRAWAL, CEDEAR_BUY, csv } from './__fixtures__/cocos';
import { CashMovement } from '../types';

const fx = emptyFxRates(1000);

const movimiento = (p: Partial<CashMovement>): CashMovement => ({
  id: 'x',
  date: '2026-01-01',
  kind: 'deposit',
  description: '',
  currency: 'ARS',
  amount: 0,
  ...p,
});

describe('calculateCashBalance', () => {
  it('resta las compras de los aportes', () => {
    const { orders, cash } = parseCocosText(csv(CASH_DEPOSIT, CEDEAR_BUY));
    const balance = calculateCashBalance(orders, cash, fx);
    // 800.000 de aporte menos 266.703,86 de la compra.
    expect(balance.ars).toBeCloseTo(533_296.14, 2);
    expect(balance.depositsUSD).toBeCloseTo(800, 4);
  });

  it('lleva pesos y dólares por separado', () => {
    const balance = calculateCashBalance(
      [],
      [
        movimiento({ id: 'a', currency: 'ARS', amount: 1000 }),
        movimiento({ id: 'b', currency: 'USD', amount: 50 }),
      ],
      fx
    );
    expect(balance.ars).toBe(1000);
    expect(balance.usd).toBe(50);
    expect(balance.totalUSD).toBeCloseTo(51, 6);
  });

  it('acumula retiros y dividendos por separado', () => {
    const { orders, cash } = parseCocosText(csv(CASH_DEPOSIT, CASH_WITHDRAWAL));
    const balance = calculateCashBalance(orders, cash, fx);
    expect(balance.withdrawalsUSD).toBeCloseTo(41.97769, 4);
    expect(balance.dividendsUSD).toBe(0);
  });
});

describe('calculateStats', () => {
  const { orders, cash } = parseCocosText(csv(CASH_DEPOSIT, CEDEAR_BUY));
  const stats = calculateStats(orders, cash, fx, 300);

  it('cuenta operaciones por tipo', () => {
    expect(stats.totalOrders).toBe(1);
    expect(stats.buyOrders).toBe(1);
    expect(stats.sellOrders).toBe(0);
  });

  it('suma los costos y su ratio sobre el bruto', () => {
    expect(stats.costs.totalUSD).toBeGreaterThan(0);
    expect(stats.costs.costRatio).toBeGreaterThan(0);
    expect(stats.costs.costRatio).toBeLessThan(5);
  });

  it('agrupa la actividad por mes', () => {
    expect(stats.monthly).toHaveLength(1);
    expect(stats.monthly[0].label).toBe('08/26');
  });

  it('calcula la TIR cuando hay aportes fechados', () => {
    expect(stats.xirr).not.toBeNull();
  });

  it('agrupa el resultado por año fiscal', () => {
    expect(stats.fiscalYears.map((y) => y.year)).toEqual([2026]);
  });
});

describe('concentrationIndex', () => {
  it('un solo activo da el máximo', () => {
    expect(concentrationIndex([100])).toBeCloseTo(10_000, 4);
  });

  it('cuatro partes iguales dan 2.500', () => {
    expect(concentrationIndex([25, 25, 25, 25])).toBeCloseTo(2_500, 4);
  });

  it('sin datos da cero', () => {
    expect(concentrationIndex([])).toBe(0);
  });
});

describe('maxDrawdown', () => {
  it('mide la caída desde el pico previo', () => {
    expect(maxDrawdown([100, 120, 60, 90])).toBeCloseTo(-50, 4);
  });

  it('una serie que sólo sube no tiene caída', () => {
    expect(maxDrawdown([100, 110, 120])).toBe(0);
  });
});
