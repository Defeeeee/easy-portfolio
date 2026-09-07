import { describe, expect, it } from 'vitest';
import { ASSET_TYPES, getAssetType } from './assetTypes';

describe('getAssetType', () => {
  it.each([
    ['CEDEAR NVIDIA CORPORATION (NVDA)', 'NVDA', ASSET_TYPES.CEDEAR],
    ['FCI COCOS PESOS PLUS CL.A $ (COCOSPPA)', 'COCOSPPA', ASSET_TYPES.FCI],
    ['FCI COCOS DOLARES PLUS CL.A UDS ESC (COCOUSDPA)', 'COCOUSDPA', ASSET_TYPES.FCI],
    ['FONDO COMUN DE INVERSION XYZ', 'XYZ', ASSET_TYPES.FCI],
    ['ON TARJETA NARANJA CL.66 S.1 30/11/26 $ (T661O)', 'T661O', ASSET_TYPES.ON],
    ['BONAR 2030 (AL30)', 'AL30', ASSET_TYPES.BONO_PUBLICO],
    ['Dólar estadounidense', 'USD', ASSET_TYPES.EFECTIVO],
    ['YPF SOCIEDAD ANONIMA (YPFD)', 'YPFD', ASSET_TYPES.ACCION],
  ])('clasifica %s como %s', (especie, ticker, expected) => {
    expect(getAssetType(especie, ticker)).toBe(expected);
  });

  it('reconoce el FCI aunque la especie arranque con FCI sin espacio previo', () => {
    // Antes se buscaba " FCI" con espacio adelante y esta especie no matcheaba.
    expect(getAssetType('FCI COCOS PESOS PLUS CL.A $', 'COCOSPPA')).toBe(ASSET_TYPES.FCI);
  });

  it('prioriza CEDEAR sobre cualquier otra pista', () => {
    expect(getAssetType('CEDEAR ISHARES FONDO ETF (ITA)', 'ITA')).toBe(ASSET_TYPES.CEDEAR);
  });
});
