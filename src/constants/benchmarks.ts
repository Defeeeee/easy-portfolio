export interface BenchmarkOption {
  key: string;
  label: string;
  /** Ticker en el proveedor de precios. `null` = no cotiza, se simula. */
  ticker: string | null;
  description: string;
}

/**
 * Alternativas contra las que comparar la cartera. Todas se simulan con los
 * mismos aportes y en las mismas fechas que las compras reales.
 */
export const BENCHMARKS: BenchmarkOption[] = [
  {
    key: 'spy',
    label: 'S&P 500',
    ticker: 'SPY.BA',
    description: 'CEDEAR del índice S&P 500',
  },
  {
    key: 'qqq',
    label: 'Nasdaq 100',
    ticker: 'QQQ.BA',
    description: 'CEDEAR del índice Nasdaq 100',
  },
  {
    key: 'merval',
    label: 'Merval',
    ticker: '^MERV',
    description: 'Índice líder de acciones argentinas',
  },
  {
    key: 'mep',
    label: 'Dólar MEP',
    ticker: null,
    description: 'Comprar dólares y no hacer nada',
  },
];

export const DEFAULT_BENCHMARK = 'spy';

export function benchmarkByKey(key: string): BenchmarkOption {
  return BENCHMARKS.find((b) => b.key === key) ?? BENCHMARKS[0];
}
