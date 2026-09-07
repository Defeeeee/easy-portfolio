import { describe, expect, it } from 'vitest';
import { FundQuote, matchFund, normalizeFundName } from './fciMatch';

const funds: FundQuote[] = [
  {
    fondo: 'Cocos Pesos Plus - Clase A',
    fecha: '2026-09-04',
    vcp: 1450.418,
    categoria: 'rentaFija',
  },
  {
    fondo: 'Cocos Pesos Plus - Clase B',
    fecha: '2026-09-04',
    vcp: 1477.066,
    categoria: 'rentaFija',
  },
  {
    fondo: 'Cocos Ahorro - Clase A',
    fecha: '2026-09-04',
    vcp: 2373.158,
    categoria: 'mercadoDinero',
  },
  {
    fondo: 'Cocos Dólar Money Market - Clase B',
    fecha: '2026-09-04',
    vcp: 1001.713,
    categoria: 'mercadoDinero',
  },
  { fondo: 'Delta Pesos - Clase A', fecha: '2026-09-04', vcp: 900, categoria: 'rentaFija' },
];

describe('normalizeFundName', () => {
  it('saca el ticker, los acentos y las palabras de relleno', () => {
    expect(normalizeFundName('FCI COCOS PESOS PLUS CL.A $ (COCOSPPA)')).toEqual({
      words: ['COCOS', 'PESOS', 'PLUS'],
      clase: 'a',
    });
  });

  it('entiende las dos formas de escribir la clase', () => {
    expect(normalizeFundName('Cocos Pesos Plus - Clase A').clase).toBe('a');
    expect(normalizeFundName('FCI X CL.B').clase).toBe('b');
  });
});

describe('matchFund', () => {
  it('encuentra el fondo del usuario con su clase', () => {
    const match = matchFund('FCI COCOS PESOS PLUS CL.A $ (COCOSPPA)', funds);
    expect(match?.fondo).toBe('Cocos Pesos Plus - Clase A');
    expect(match?.vcp).toBe(1450.418);
  });

  it('no confunde clases del mismo fondo', () => {
    expect(matchFund('FCI COCOS PESOS PLUS CL.B $', funds)?.fondo).toBe(
      'Cocos Pesos Plus - Clase B'
    );
  });

  it('no elige un fondo distinto de la misma administradora', () => {
    const match = matchFund('FCI COCOS PESOS PLUS CL.A $ (COCOSPPA)', funds);
    expect(match?.fondo).not.toBe('Cocos Ahorro - Clase A');
  });

  it('matchea el fondo en dólares', () => {
    const match = matchFund('FCI COCOS DOLAR MONEY MARKET CL.B UDS (COCOUSD)', funds);
    expect(match?.fondo).toBe('Cocos Dólar Money Market - Clase B');
  });

  it('devuelve null cuando no hay nada parecido', () => {
    expect(matchFund('CEDEAR NVIDIA CORPORATION (NVDA)', funds)).toBeNull();
    expect(matchFund('FCI GALILEO EVENT DRIVEN CL.A', funds)).toBeNull();
  });
});
