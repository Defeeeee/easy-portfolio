import * as XLSX from 'xlsx';
import { CashKind, CashMovement, ParsedFile, RawOrder } from '../types';

export function parseOrderDate(dateVal: string): Date {
  if (!dateVal) return new Date();

  const dateStr = String(dateVal).trim();

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  return new Date();
}

function parseNumber(value: number | string): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const stringVal = String(value).replace(/\./g, '').replace(/,/g, '.');
  return parseFloat(stringVal) || 0;
}

function readFileAs(file: File, mode: 'text' | 'binary'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo'));
    if (mode === 'text') reader.readAsText(file);
    else reader.readAsBinaryString(file);
  });
}

export async function parseBalanz(file: File): Promise<ParsedFile> {
  const data = await readFileAs(file, 'binary');
  const workbook = XLSX.read(data, { type: 'binary' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const orders: RawOrder[] = rawData
    .map((row, index) => {
      const getVal = (keyStr: string) => {
        const key = Object.keys(row).find((k) => k.trim() === keyStr);
        return key ? row[key] : '';
      };
      const str = (v: unknown) => String(v ?? '');

      const boleto = str(getVal('Num Boleto'));

      return {
        id: `balanz-${boleto || index}`,
        Especie: str(getVal('Especie')),
        'Num Boleto': boleto,
        Ticker: str(getVal('Ticker')),
        Tipo: str(getVal('Tipo')).toUpperCase(),
        Concertacion: str(getVal('Concertacion')),
        Liquidacion: str(getVal('Liquidacion')),
        Cantidad: parseNumber(str(getVal('Cantidad'))),
        Precio: parseNumber(str(getVal('Precio'))),
        Bruto: parseNumber(str(getVal('Bruto'))),
        'Costos Mercado': parseNumber(str(getVal('Costos Mercado'))),
        Arancel: parseNumber(str(getVal('Arancel'))),
        Neto: parseNumber(str(getVal('Neto'))),
        Moneda: str(getVal('Moneda')),
      };
    })
    .filter((order) => order.Ticker && order.Cantidad > 0);

  // El export de Balanz sólo trae operaciones sobre especies.
  return { orders, cash: [] };
}

export async function parseBullMarket(): Promise<ParsedFile> {
  throw new Error('El parser para Bull Market aún no está implementado.');
}

function parseCocosDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

function extractCocosTicker(instrumento: string): string {
  const match = instrumento.match(/\(([^)]+)\)$/);
  if (match) {
    return match[1].trim();
  }
  const parts = instrumento.split(' - ');
  if (parts.length > 1) {
    return parts[0].trim();
  }
  return instrumento.trim();
}

/** Clasifica los movimientos de Cocos que no son compra/venta de una especie. */
function cashKindOf(tipoOperacion: string): CashKind | null {
  const t = tipoOperacion.toLowerCase();
  if (t.includes('dividendo')) return 'dividend';
  if (t.includes('recibo de cobro')) return 'deposit';
  if (t.includes('orden de pago')) return 'withdrawal';
  if (t.includes('nota de credito') || t.includes('nota de débito')) return 'other';
  return null;
}

export async function parseCocos(file: File): Promise<ParsedFile> {
  const text = await readFileAs(file, 'text');
  if (!text) return { orders: [], cash: [] };

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return { orders: [], cash: [] };

  const orders: RawOrder[] = [];
  const cash: CashMovement[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(';');
    if (cols.length < 10) continue;

    const nroTicket = cols[0]?.trim() || `cocos-${i}`;
    const nroComprobante = cols[1]?.trim() || '';
    const id = `${nroTicket}-${nroComprobante}`;

    const tipoOperacion = cols[4]?.trim() || '';
    const instrumento = cols[5]?.trim() || '';
    if (instrumento.toLowerCase() === 'instrumento') continue;

    const monedaRaw = cols[6]?.trim().toUpperCase() || '';
    const isUSD = monedaRaw === 'USD' || monedaRaw === 'EXT' || monedaRaw.startsWith('D');

    const concertacion = parseCocosDate(cols[2]);
    const liquidacion = parseCocosDate(cols[3]);
    const rawTotal = cols[15] ? parseNumber(cols[15]) : 0;

    // Aportes, retiros y dividendos: no son posiciones pero mueven el efectivo.
    const kind = cashKindOf(tipoOperacion);
    if (kind || !instrumento) {
      if (rawTotal !== 0) {
        cash.push({
          id,
          date: concertacion,
          kind: kind ?? 'other',
          description: tipoOperacion,
          currency: isUSD ? 'USD' : 'ARS',
          amount: rawTotal,
        });
      }
      continue;
    }

    const rawCantidad = parseNumber(cols[8]);
    const rawPrecio = parseNumber(cols[9]);
    const rawBruto = cols[10] ? parseNumber(cols[10]) : 0;

    const comision = cols[11] ? Math.abs(parseNumber(cols[11])) : 0;
    const ddmm = cols[12] ? Math.abs(parseNumber(cols[12])) : 0;
    const iva = cols[13] ? Math.abs(parseNumber(cols[13])) : 0;
    const otros = cols[14] ? Math.abs(parseNumber(cols[14])) : 0;

    const tipoOpLower = tipoOperacion.toLowerCase();
    let tipo = 'COMPRA';
    if (tipoOpLower.includes('compra') || tipoOpLower.includes('suscripcion')) {
      tipo = 'COMPRA';
    } else if (tipoOpLower.includes('venta') || tipoOpLower.includes('rescate')) {
      tipo = 'VENTA';
    } else if (rawCantidad < 0) {
      tipo = 'VENTA';
    }

    const cantidad = Math.abs(rawCantidad);
    const bruto = Math.abs(rawBruto) || Math.abs(rawPrecio * rawCantidad);
    // La columna `precio` del export de Cocos no siempre viene por unidad:
    // los FCI cotizan por cada 1.000 cuotapartes y las ON por cada 100 VN.
    // `montoBruto` sí está en moneda real, así que derivamos el precio unitario.
    const precio = cantidad > 0 && bruto > 0 ? bruto / cantidad : Math.abs(rawPrecio);
    const neto = Math.abs(rawTotal) || bruto;

    if (cantidad <= 0) continue;

    orders.push({
      id,
      Especie: instrumento,
      'Num Boleto': nroTicket,
      Ticker: extractCocosTicker(instrumento),
      Tipo: tipo,
      Concertacion: concertacion || new Date().toISOString(),
      Liquidacion: liquidacion || new Date().toISOString(),
      Cantidad: cantidad,
      Precio: precio,
      Bruto: bruto,
      'Costos Mercado': ddmm + iva + otros,
      Arancel: comision,
      Neto: neto,
      Moneda: isUSD ? 'Dólar' : 'Pesos',
    });
  }

  return { orders, cash };
}

/**
 * Une varios exports en uno solo. Los brokers exportan por tramos y los
 * re-exports se solapan, así que se descarta todo lo que repita comprobante.
 */
export function mergeParsedFiles(files: ParsedFile[]): ParsedFile & { duplicates: number } {
  const orders: RawOrder[] = [];
  const cash: CashMovement[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const file of files) {
    for (const order of file.orders) {
      const key = `o:${order.id}`;
      if (seen.has(key)) {
        duplicates += 1;
        continue;
      }
      seen.add(key);
      orders.push(order);
    }
    for (const movement of file.cash) {
      const key = `c:${movement.id}`;
      if (seen.has(key)) {
        duplicates += 1;
        continue;
      }
      seen.add(key);
      cash.push(movement);
    }
  }

  return { orders, cash, duplicates };
}
