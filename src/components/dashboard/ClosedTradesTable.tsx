'use client';

import { useMemo, useState } from 'react';
import { ClosedTrade } from '@/types';
import { Card } from '@/components/ui/Card';
import { usePrivacy } from '@/context/PrivacyContext';
import { formatCurrency, formatDate, formatPercent, formatQuantity } from '@/utils/format';
import { parseOrderDate } from '@/utils/parser';
import { ExportButton } from '@/components/ui/ExportButton';
import { closedTradesToCsv, downloadCsv } from '@/utils/export';

interface ClosedTradesTableProps {
  trades: ClosedTrade[];
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
}

const PAGE_SIZE = 8;

export function ClosedTradesTable({ trades, arsToUsdRate, currency }: ClosedTradesTableProps) {
  const { isPrivate } = usePrivacy();
  const [expanded, setExpanded] = useState(false);
  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;

  const sorted = useMemo(
    () =>
      [...trades].sort(
        (a, b) => parseOrderDate(b.date).getTime() - parseOrderDate(a.date).getTime()
      ),
    [trades]
  );

  const visible = expanded ? sorted : sorted.slice(0, PAGE_SIZE);
  const totalPnl = sorted.reduce((sum, t) => sum + t.pnlUSD, 0) * multiplier;

  if (sorted.length === 0) {
    return (
      <Card title="Operaciones cerradas">
        <p className="text-sm text-slate-400 py-12 text-center dark:text-slate-500">
          Todavía no hay ventas registradas en el archivo.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Operaciones cerradas"
      subtitle={`${sorted.length} ventas · resultado realizado por costo promedio ponderado`}
      action={
        <div className="flex items-center gap-1">
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-md tabular-nums ${
              totalPnl >= 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
            }`}
          >
            {isPrivate ? '***' : formatCurrency(totalPnl, currency, { showSign: true })}
          </span>
          <ExportButton
            onExport={() =>
              downloadCsv(
                'operaciones-cerradas.csv',
                closedTradesToCsv(sorted, multiplier, currency)
              )
            }
          />
        </div>
      }
      bodyClassName="px-0 pb-0"
      footer={
        sorted.length > PAGE_SIZE ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
          >
            {expanded ? 'Ver menos' : `Ver las ${sorted.length} operaciones`}
          </button>
        ) : undefined
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 border-y border-slate-100 dark:text-slate-500 dark:border-slate-800">
              <th className="text-left px-6 py-2.5 font-semibold">Fecha</th>
              <th className="text-left px-4 py-2.5 font-semibold">Ticker</th>
              <th className="text-right px-4 py-2.5 font-semibold">Cantidad</th>
              <th className="text-right px-4 py-2.5 font-semibold">Costo</th>
              <th className="text-right px-4 py-2.5 font-semibold">Venta</th>
              <th className="text-right px-6 py-2.5 font-semibold">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {visible.map((trade, index) => (
              <tr
                key={`${trade.ticker}-${trade.date}-${index}`}
                className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/40"
              >
                <td className="px-6 py-3 text-xs text-slate-500 font-mono whitespace-nowrap dark:text-slate-400">
                  {formatDate(trade.date)}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                  {trade.ticker}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-600 tabular-nums dark:text-slate-300">
                  {formatQuantity(trade.quantity)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-500 tabular-nums dark:text-slate-400">
                  {isPrivate ? '***' : formatCurrency(trade.costBasisUSD * multiplier, currency)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-500 tabular-nums dark:text-slate-400">
                  {isPrivate ? '***' : formatCurrency(trade.proceedsUSD * multiplier, currency)}
                </td>
                <td className="px-6 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                  <span
                    className={`font-semibold ${trade.pnlUSD >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    {isPrivate
                      ? '***'
                      : formatCurrency(trade.pnlUSD * multiplier, currency, { showSign: true })}
                  </span>
                  <span className="text-slate-400 ml-2 text-xs dark:text-slate-500">
                    {formatPercent(trade.pnlPercentage)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
