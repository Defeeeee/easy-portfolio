import { describe, expect, it } from 'vitest';
import { detectBrokerFromHeader } from './brokerDetect';
import { COCOS_HEADER } from './__fixtures__/cocos';

describe('detectBrokerFromHeader', () => {
  it('reconoce el export de Cocos', () => {
    expect(detectBrokerFromHeader(COCOS_HEADER)).toBe('cocos');
  });

  it('reconoce el export de Balanz', () => {
    expect(
      detectBrokerFromHeader('Especie;Num Boleto;Ticker;Tipo;Concertacion;Cantidad;Precio')
    ).toBe('balanz');
  });

  it('no adivina con una cabecera desconocida', () => {
    expect(detectBrokerFromHeader('fecha,importe,detalle')).toBeNull();
    expect(detectBrokerFromHeader('')).toBeNull();
  });
});
