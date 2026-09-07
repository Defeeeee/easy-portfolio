import { describe, expect, it } from 'vitest';
import { mergeParsedFiles, parseCocosText } from './parser';
import {
  CASH_DEPOSIT,
  CASH_WITHDRAWAL,
  CEDEAR_BUY,
  DIVIDEND,
  FCI_SUBSCRIPTION,
  ON_BUY_USD,
  ON_SELL_ARS,
  csv,
} from './__fixtures__/cocos';

describe('parseCocosText', () => {
  it('lee el precio unitario de un CEDEAR tal como viene', () => {
    const { orders } = parseCocosText(csv(CEDEAR_BUY));
    expect(orders).toHaveLength(1);
    expect(orders[0].Ticker).toBe('PLTR');
    expect(orders[0].Cantidad).toBe(4);
    expect(orders[0].Precio).toBeCloseTo(66_275, 4);
  });

  it('convierte el precio de un FCI, que viene por cada 1.000 cuotapartes', () => {
    const { orders } = parseCocosText(csv(FCI_SUBSCRIPTION));
    const [order] = orders;
    // El archivo dice 1.422,719; el precio real por cuotaparte es ~1,4227.
    expect(order.Precio).toBeCloseTo(1.4227, 3);
    expect(order.Cantidad * Number(order.Precio)).toBeCloseTo(600_000, 0);
  });

  it('convierte el precio de una ON, que viene por cada 100 VN', () => {
    const { orders } = parseCocosText(csv(ON_SELL_ARS));
    const [order] = orders;
    expect(order.Precio).toBeCloseTo(1.055, 4);
    expect(order.Cantidad * Number(order.Precio)).toBeCloseTo(165_513.675, 0);
  });

  it('separa aportes y retiros como movimientos de efectivo', () => {
    const { orders, cash } = parseCocosText(csv(CASH_DEPOSIT, CASH_WITHDRAWAL));
    expect(orders).toHaveLength(0);
    expect(cash).toHaveLength(2);
    expect(cash[0]).toMatchObject({ kind: 'deposit', currency: 'ARS', amount: 800_000 });
    expect(cash[1]).toMatchObject({ kind: 'withdrawal', currency: 'ARS' });
    expect(cash[1].amount).toBeCloseTo(-41_977.69, 2);
  });

  it('trata el dividendo en especie como efectivo y no como posición', () => {
    const { orders, cash } = parseCocosText(csv(DIVIDEND));
    expect(orders).toHaveLength(0);
    expect(cash).toHaveLength(1);
    expect(cash[0].kind).toBe('dividend');
  });

  it('marca la moneda de cada operación', () => {
    const { orders } = parseCocosText(csv(ON_BUY_USD, ON_SELL_ARS));
    expect(orders.map((o) => o.Moneda)).toEqual(['Dólar', 'Pesos']);
  });

  it('ignora filas cortas y encabezados repetidos', () => {
    const { orders } = parseCocosText(csv('a;b;c', CEDEAR_BUY));
    expect(orders).toHaveLength(1);
  });
});

describe('mergeParsedFiles', () => {
  it('descarta lo que se repite entre exports solapados', () => {
    const a = parseCocosText(csv(CEDEAR_BUY, CASH_DEPOSIT));
    const b = parseCocosText(csv(CEDEAR_BUY, CASH_DEPOSIT, FCI_SUBSCRIPTION));

    const merged = mergeParsedFiles([a, b]);

    expect(merged.orders).toHaveLength(2);
    expect(merged.cash).toHaveLength(1);
    expect(merged.duplicates).toBe(2);
  });

  it('no pierde nada cuando los archivos no se solapan', () => {
    const merged = mergeParsedFiles([
      parseCocosText(csv(CEDEAR_BUY)),
      parseCocosText(csv(FCI_SUBSCRIPTION)),
    ]);
    expect(merged.orders).toHaveLength(2);
    expect(merged.duplicates).toBe(0);
  });
});

describe('priceScale', () => {
  it('vale 1 para un CEDEAR', () => {
    const { orders } = parseCocosText(csv(CEDEAR_BUY));
    expect(orders[0].priceScale).toBe(1);
  });

  it('vale 1.000 para un FCI', () => {
    const { orders } = parseCocosText(csv(FCI_SUBSCRIPTION));
    expect(orders[0].priceScale).toBe(1000);
  });

  it('vale 100 para una ON', () => {
    const { orders } = parseCocosText(csv(ON_SELL_ARS));
    expect(orders[0].priceScale).toBe(100);
  });
});
