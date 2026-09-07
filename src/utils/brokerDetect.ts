import { BrokerType } from '@/constants/brokers';

/**
 * Deduce el broker por la forma del archivo. El de Cocos es un CSV con punto y
 * coma cuya cabecera arranca en `nroTicket`; el de Balanz es una planilla con
 * columnas `Num Boleto` y `Especie`.
 */
export function detectBrokerFromHeader(header: string): BrokerType | null {
  const normalized = header.toLowerCase();

  if (normalized.includes('nroticket') && normalized.includes('nrocomprobante')) {
    return 'cocos';
  }
  if (normalized.includes('num boleto') && normalized.includes('especie')) {
    return 'balanz';
  }
  return null;
}

/** Lee sólo el arranque del archivo: alcanza para reconocer la cabecera. */
export async function detectBroker(file: File): Promise<BrokerType | null> {
  if (file.name.toLowerCase().endsWith('.xlsx')) return 'balanz';

  const head = await file.slice(0, 4096).text();
  return detectBrokerFromHeader(head.split(/\r?\n/)[0] ?? '');
}
