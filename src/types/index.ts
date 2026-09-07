export interface RawOrder {
  /** Clave estable para deduplicar cuando se suben varios exports solapados. */
  id: string;
  Especie: string;
  'Num Boleto': string | number;
  Ticker: string;
  Tipo: string;
  Concertacion: string;
  Liquidacion: string;
  Cantidad: number;
  Precio: number | string;
  Bruto: number | string;
  'Costos Mercado': number | string;
  Arancel: number | string;
  Neto: number | string;
  Moneda: string;
  /**
   * Cuántas unidades cotiza la columna `precio` del broker: 1 para acciones y
   * CEDEARs, 1.000 para los FCI y 100 para las ONs. Permite traducir el VCP que
   * publican las fuentes externas a precio por unidad.
   */
  priceScale?: number;
}

/** De dónde salió el precio con el que se valúa una posición. */
export type PriceSource = 'market' | 'fund-nav' | 'last-trade';

export interface Position {
  ticker: string;
  especie: string;
  assetType: string;
  /** Moneda en la que se operó la especie; define cómo valuarla. */
  currency: 'ARS' | 'USD';
  quantity: number;
  averagePrice: number; // in USD
  investedValueUSD: number;
  /** Unidades que cotiza el precio del broker (1 / 100 / 1.000). */
  priceScale?: number;
  currentPriceUSD?: number;
  currentValueUSD?: number;
  pnlAbsolute?: number;
  pnlPercentage?: number;
  priceSource?: PriceSource;
  /** Fecha del precio cuando no proviene del mercado en vivo. */
  priceDate?: string;
  /** Nombre del fondo que se usó para valuar, cuando el precio es un VCP. */
  fundName?: string;
}

/** Una compra cerrada contra una venta posterior (costo promedio ponderado). */
export interface ClosedTrade {
  ticker: string;
  especie: string;
  assetType: string;
  date: string;
  quantity: number;
  costBasisUSD: number;
  proceedsUSD: number;
  pnlUSD: number;
  pnlPercentage: number;
}

export interface MonthlyActivity {
  month: string; // YYYY-MM
  label: string; // MM/YYYY
  buysUSD: number;
  sellsUSD: number;
  netUSD: number;
  trades: number;
}

export interface CostBreakdown {
  arancelUSD: number;
  mercadoUSD: number;
  totalUSD: number;
  /** Costos totales sobre el volumen bruto operado, en %. */
  costRatio: number;
}

export interface PortfolioStats {
  realizedPnlUSD: number;
  realizedPnlPercentage: number;
  closedTrades: ClosedTrade[];
  costs: CostBreakdown;
  monthly: MonthlyActivity[];
  totalOrders: number;
  buyOrders: number;
  sellOrders: number;
  volumeUSD: number;
  firstDate: string | null;
  lastDate: string | null;
  daysActive: number;
  mostTradedTicker: string | null;
  cash: CashBalance;
  cashMovements: CashMovement[];
  /** Tasa anualizada (0,15 = 15%). `null` cuando no hay aportes fechados. */
  xirr: number | null;
  fiscalYears: FiscalYearResult[];
}

export type CashKind = 'deposit' | 'withdrawal' | 'dividend' | 'other';

/** Movimiento de dinero que no es compra ni venta de un activo. */
export interface CashMovement {
  id: string;
  date: string;
  kind: CashKind;
  description: string;
  currency: 'ARS' | 'USD';
  /** Firmado y en su propia moneda: positivo entra, negativo sale. */
  amount: number;
}

export interface ParsedFile {
  orders: RawOrder[];
  cash: CashMovement[];
}

export interface CashBalance {
  ars: number;
  usd: number;
  totalUSD: number;
  depositsUSD: number;
  withdrawalsUSD: number;
  dividendsUSD: number;
}

export interface FiscalYearResult {
  year: number;
  realizedUSD: number;
  trades: number;
  costsUSD: number;
}

export interface BenchmarkPoint {
  timestamp: number;
  portfolioUSD: number;
  spyUSD?: number;
  mepUSD?: number;
}
