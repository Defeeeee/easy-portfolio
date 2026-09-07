export interface RawOrder {
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
}

/** De dónde salió el precio con el que se valúa una posición. */
export type PriceSource = 'market' | 'last-trade';

export interface Position {
  ticker: string;
  especie: string;
  assetType: string;
  quantity: number;
  averagePrice: number; // in USD
  investedValueUSD: number;
  currentPriceUSD?: number;
  currentValueUSD?: number;
  pnlAbsolute?: number;
  pnlPercentage?: number;
  priceSource?: PriceSource;
  /** Fecha del precio cuando proviene de la última operación del archivo. */
  priceDate?: string;
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
}
