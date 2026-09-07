import { describe, expect, it } from 'vitest';
import { xirr } from './xirr';

const day = (iso: string) => new Date(iso).getTime();

describe('xirr', () => {
  it('resuelve el caso clásico de planilla', () => {
    // Mismo ejemplo que la función XIRR de Excel: ~37,34% anual.
    const rate = xirr([
      { t: day('2008-01-01'), amount: -10_000 },
      { t: day('2008-03-01'), amount: 2_750 },
      { t: day('2008-10-30'), amount: 4_250 },
      { t: day('2009-02-15'), amount: 3_250 },
      { t: day('2009-04-01'), amount: 2_750 },
    ]);
    expect(rate).not.toBeNull();
    expect((rate as number) * 100).toBeCloseTo(37.34, 1);
  });

  it('devuelve 0% cuando se recupera exactamente lo aportado', () => {
    const rate = xirr([
      { t: day('2025-01-01'), amount: -1000 },
      { t: day('2026-01-01'), amount: 1000 },
    ]);
    expect(rate as number).toBeCloseTo(0, 4);
  });

  it('duplicar el capital en un año es 100%', () => {
    const rate = xirr([
      { t: day('2025-01-01'), amount: -1000 },
      { t: day('2026-01-01'), amount: 2000 },
    ]);
    expect((rate as number) * 100).toBeCloseTo(100, 0);
  });

  it('reconoce una pérdida', () => {
    const rate = xirr([
      { t: day('2025-01-01'), amount: -1000 },
      { t: day('2026-01-01'), amount: 800 },
    ]);
    expect(rate as number).toBeLessThan(0);
  });

  it('pondera cuándo entró cada aporte', () => {
    // Mismo total aportado y mismo resultado, pero el segundo aporte entra tarde:
    // al estar menos tiempo invertido, la tasa que lo explica es mayor.
    const temprano = xirr([
      { t: day('2025-01-01'), amount: -1000 },
      { t: day('2025-02-01'), amount: -1000 },
      { t: day('2026-01-01'), amount: 2200 },
    ]) as number;
    const tarde = xirr([
      { t: day('2025-01-01'), amount: -1000 },
      { t: day('2025-11-01'), amount: -1000 },
      { t: day('2026-01-01'), amount: 2200 },
    ]) as number;
    expect(tarde).toBeGreaterThan(temprano);
  });

  it('devuelve null si no hay cambio de signo', () => {
    expect(
      xirr([
        { t: day('2025-01-01'), amount: -1000 },
        { t: day('2026-01-01'), amount: -500 },
      ])
    ).toBeNull();
  });

  it('devuelve null con menos de dos flujos o sin rango de fechas', () => {
    expect(xirr([{ t: day('2025-01-01'), amount: -1000 }])).toBeNull();
    expect(
      xirr([
        { t: day('2025-01-01'), amount: -1000 },
        { t: day('2025-01-01'), amount: 1200 },
      ])
    ).toBeNull();
  });
});
