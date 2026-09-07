export type Currency = 'USD' | 'ARS';

const LOCALES: Record<Currency, string> = { USD: 'en-US', ARS: 'es-AR' };
const PREFIX: Record<Currency, string> = { USD: 'US$ ', ARS: 'AR$ ' };

export function formatCurrency(
  value: number,
  currency: Currency,
  { decimals = 2, showSign = false }: { decimals?: number; showSign?: boolean } = {}
): string {
  const sign = value < 0 ? '-' : showSign ? '+' : '';
  const body = Math.abs(value).toLocaleString(LOCALES[currency], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}${PREFIX[currency]}${body}`;
}

/**
 * Precio unitario: un CEDEAR vale decenas de dólares y una cuotaparte de FCI
 * milésimas, así que la cantidad de decimales se adapta a la magnitud.
 */
export function formatPrice(value: number, currency: Currency): string {
  const abs = Math.abs(value);
  const decimals = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return formatCurrency(value, currency, { decimals });
}

/** Versión corta para ejes: 1.2k / 3.4M. */
export function formatCompact(value: number, currency: Currency): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const prefix = PREFIX[currency];
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${prefix}${abs.toFixed(0)}`;
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatQuantity(value: number): string {
  const decimals = Number.isInteger(value) ? 0 : Math.abs(value) < 1 ? 4 : 2;
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** "dd-mm-yyyy" o "yyyy-mm-dd" -> "dd/mm/yyyy". */
export function formatDate(value: string): string {
  if (!value) return '';
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = value.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (dmy) return `${dmy[1]}/${dmy[2]}/${dmy[3]}`;
  return value;
}
