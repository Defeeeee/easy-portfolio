import { ClosedTrade, Position } from '../types';
import { formatDate } from './format';

function escapeCell(value: string | number): string {
  const text = String(value ?? '');
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: (string | number)[][]): string {
  // Punto y coma y coma decimal: es lo que Excel en es-AR abre sin preguntar.
  return rows.map((row) => row.map(escapeCell).join(';')).join('\n');
}

function num(value: number | undefined, decimals = 2): string {
  if (value === undefined || !Number.isFinite(value)) return '';
  return value.toFixed(decimals).replace('.', ',');
}

export function positionsToCsv(
  positions: Position[],
  multiplier: number,
  currency: string
): string {
  const rows: (string | number)[][] = [
    [
      'Ticker',
      'Especie',
      'Tipo',
      'Cantidad',
      `Precio actual (${currency})`,
      `Costo total (${currency})`,
      `Valor actual (${currency})`,
      `P&L (${currency})`,
      'P&L %',
      'Origen del precio',
    ],
  ];

  for (const p of positions) {
    rows.push([
      p.ticker,
      p.especie,
      p.assetType,
      num(p.quantity, 4),
      num(p.currentPriceUSD !== undefined ? p.currentPriceUSD * multiplier : undefined, 6),
      num(p.investedValueUSD * multiplier),
      num(p.currentValueUSD !== undefined ? p.currentValueUSD * multiplier : undefined),
      num(p.pnlAbsolute !== undefined ? p.pnlAbsolute * multiplier : undefined),
      num(p.pnlPercentage),
      p.priceSource === 'market'
        ? 'mercado'
        : p.priceSource === 'last-trade'
          ? 'última operación'
          : '',
    ]);
  }

  return toCsv(rows);
}

export function closedTradesToCsv(
  trades: ClosedTrade[],
  multiplier: number,
  currency: string
): string {
  const rows: (string | number)[][] = [
    [
      'Fecha',
      'Ticker',
      'Tipo',
      'Cantidad',
      `Costo (${currency})`,
      `Venta (${currency})`,
      `Resultado (${currency})`,
      'Resultado %',
    ],
  ];

  for (const t of trades) {
    rows.push([
      formatDate(t.date),
      t.ticker,
      t.assetType,
      num(t.quantity, 4),
      num(t.costBasisUSD * multiplier),
      num(t.proceedsUSD * multiplier),
      num(t.pnlUSD * multiplier),
      num(t.pnlPercentage),
    ]);
  }

  return toCsv(rows);
}

export function downloadCsv(filename: string, content: string): void {
  // BOM para que Excel reconozca el UTF-8 y no rompa los acentos.
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
