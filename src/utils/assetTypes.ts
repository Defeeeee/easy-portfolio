export const ASSET_TYPES = {
  CEDEAR: 'CEDEAR',
  ACCION: 'Acción',
  ON: 'Oblig. Negociable',
  BONO_PUBLICO: 'Bono Público',
  FCI: 'Fondo Común',
  EFECTIVO: 'Efectivo / FX',
  OTRO: 'Otro',
} as const;

export type AssetType = (typeof ASSET_TYPES)[keyof typeof ASSET_TYPES];

const BONO_PUBLICO_KEYWORDS = [
  'REPUBLICA ARGENTINA',
  'NACION ARGENTINA',
  'PROVINCIA DE',
  'MUNICIPALIDAD',
  'BOPREAL',
  'LECAP',
  'LEBAC',
  'LETES',
  'BONO DEL TESORO',
  'BONAR',
  'GLOBAL',
  'DISCOUNT',
];

const ON_KEYWORDS = ['REG S', 'REGS', 'OBLIGACION NEGOCIABLE', 'SENIOR'];

const EFECTIVO_KEYWORDS = [
  'DOLAR ESTADOUNIDENSE',
  'DÓLAR ESTADOUNIDENSE',
  'PESO ARGENTINO',
  'DOLAR MEP',
  'EFECTIVO',
];

// Clases de fondo: "FCI ...", "FONDO ...", "F.C.I ...", "... FCI"
const FCI_PATTERN = /(^|[^A-Z])(FCI|F\.C\.I|FONDO)([^A-Z]|$)/;

export function getAssetType(especie: string, ticker: string): AssetType {
  const especieUpper = especie.toUpperCase().trim();
  const tickerUpper = ticker.toUpperCase().trim();

  // CEDEARs are always labeled explicitly
  if (especieUpper.includes('CEDEAR')) {
    return ASSET_TYPES.CEDEAR;
  }

  if (EFECTIVO_KEYWORDS.some((kw) => especieUpper.includes(kw))) {
    return ASSET_TYPES.EFECTIVO;
  }

  if (FCI_PATTERN.test(especieUpper)) {
    return ASSET_TYPES.FCI;
  }

  if (BONO_PUBLICO_KEYWORDS.some((kw) => especieUpper.includes(kw))) {
    return ASSET_TYPES.BONO_PUBLICO;
  }

  const hasOnKeyword = ON_KEYWORDS.some((kw) => especieUpper.includes(kw));
  // Formato Cocos para ONs: "ON TARJETA NARANJA CL.66 S.1 30/11/26 $"
  const looksLikeCocosON = /^ON\s/.test(especieUpper) || /\bCL\.\d+\b/.test(especieUpper);
  const looksLikeBond =
    /\d+[.,]\d+%/.test(especieUpper) &&
    (/\bV\s+\d{2}\//.test(especieUpper) || especieUpper.includes('VTO'));

  if (hasOnKeyword || looksLikeCocosON || looksLikeBond) {
    return ASSET_TYPES.ON;
  }

  if (tickerUpper.length <= 5 && /^[A-Z0-9.]+$/.test(tickerUpper)) {
    return ASSET_TYPES.ACCION;
  }

  return ASSET_TYPES.OTRO;
}
