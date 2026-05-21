import * as XLSX from 'xlsx';
import { RawOrder } from '../types';

export function parseOrderDate(dateVal: string): Date {
  if (!dateVal) return new Date();

  const dateStr = String(dateVal).trim();

  // Try parsing standard formats (YYYY-MM-DD)
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  return new Date();
}

function parseNumber(value: number | string): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  // Handle comma as decimal separator if it's a string
  const stringVal = String(value).replace(/\./g, '').replace(/,/g, '.');
  return parseFloat(stringVal) || 0;
}

export async function parseBalanz(file: File): Promise<RawOrder[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON, assuming the first row is the header
        const rawData = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

        // Normalize the data
        const orders: RawOrder[] = rawData
          .map((row) => {
            // Find keys that might have leading/trailing spaces
            const getVal = (keyStr: string) => {
              const key = Object.keys(row).find((k) => k.trim() === keyStr);
              return key ? row[key] : '';
            };

            return {
              Especie: getVal('Especie'),
              'Num Boleto': getVal('Num Boleto'),
              Ticker: getVal('Ticker'),
              Tipo: getVal('Tipo').toUpperCase(),
              Concertacion: getVal('Concertacion'),
              Liquidacion: getVal('Liquidacion'),
              Cantidad: parseNumber(getVal('Cantidad')),
              Precio: parseNumber(getVal('Precio')),
              Bruto: parseNumber(getVal('Bruto')),
              'Costos Mercado': parseNumber(getVal('Costos Mercado')),
              Arancel: parseNumber(getVal('Arancel')),
              Neto: parseNumber(getVal('Neto')),
              Moneda: getVal('Moneda'),
            };
          })
          .filter((order) => order.Ticker && order.Cantidad > 0);

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}

export async function parseBullMarket(file: File): Promise<RawOrder[]> {
  return new Promise((_, reject) => {
    reject(new Error('El parser para Bull Market aún no está implementado.'));
  });
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

export async function parseCocos(file: File): Promise<RawOrder[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return resolve([]);

        // Split by newline and remove empty lines
        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length < 2) return resolve([]); // Header only or empty

        const orders: RawOrder[] = [];

        // Parse lines, skip header (i=0)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = line.split(';');
          // A valid line must have at least 10 columns (up to cantidad/precio/total)
          if (cols.length < 10) continue;

          const instrumento = cols[5]?.trim() || '';
          // Skip if there is no instrument or it is the header text
          if (!instrumento || instrumento.toLowerCase() === 'instrumento') continue;

          const rawCantidad = parseNumber(cols[8]);
          const rawPrecio = parseNumber(cols[9]);
          const rawBruto = cols[10] ? parseNumber(cols[10]) : 0;
          const rawTotal = cols[15] ? parseNumber(cols[15]) : 0;

          const comision = cols[11] ? Math.abs(parseNumber(cols[11])) : 0;
          const ddmm = cols[12] ? Math.abs(parseNumber(cols[12])) : 0;
          const iva = cols[13] ? Math.abs(parseNumber(cols[13])) : 0;
          const otros = cols[14] ? Math.abs(parseNumber(cols[14])) : 0;

          // Determine transaction Type (COMPRA or VENTA)
          const tipoOperacion = cols[4]?.trim() || '';
          let tipo = 'COMPRA';
          const tipoOpLower = tipoOperacion.toLowerCase();
          if (tipoOpLower.includes('compra') || tipoOpLower.includes('suscripcion')) {
            tipo = 'COMPRA';
          } else if (tipoOpLower.includes('venta') || tipoOpLower.includes('rescate')) {
            tipo = 'VENTA';
          } else if (rawCantidad < 0) {
            tipo = 'VENTA';
          }

          const cantidad = Math.abs(rawCantidad);
          const precio = Math.abs(rawPrecio);
          const bruto = Math.abs(rawBruto) || precio * cantidad;
          const neto = Math.abs(rawTotal) || bruto;

          if (cantidad <= 0) continue;

          // Extracted Ticker
          const ticker = extractCocosTicker(instrumento);

          // Map currency
          const monedaRaw = cols[6]?.trim().toUpperCase() || '';
          const moneda =
            monedaRaw === 'USD' ||
            monedaRaw === 'EXT' ||
            monedaRaw === 'DÓLAR' ||
            monedaRaw === 'DOLAR'
              ? 'Dólar'
              : 'Pesos';

          // Standardize dates
          const concertacion = parseCocosDate(cols[2]);
          const liquidacion = parseCocosDate(cols[3]);

          orders.push({
            Especie: instrumento,
            'Num Boleto': cols[0]?.trim() || `cocos-${i}`,
            Ticker: ticker,
            Tipo: tipo,
            Concertacion: concertacion || new Date().toISOString(),
            Liquidacion: liquidacion || new Date().toISOString(),
            Cantidad: cantidad,
            Precio: precio,
            Bruto: bruto,
            'Costos Mercado': ddmm + iva + otros,
            Arancel: comision,
            Neto: neto,
            Moneda: moneda,
          });
        }

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsText(file); // Cocos provides standard CSVs
  });
}
