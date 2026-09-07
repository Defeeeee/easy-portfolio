'use client';

import { useEffect, useMemo } from 'react';
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Position, RawOrder } from '@/types';
import { FxRates } from '@/utils/fx';
import { PriceHistory } from '@/utils/timeline';
import { orderRateToUSD, sortOrders } from '@/utils/calculator';
import { parseOrderDate } from '@/utils/parser';
import { startOfDay } from '@/utils/series';
import { usePrivacy } from '@/context/PrivacyContext';
import { useMounted } from '@/hooks/useMounted';
import {
  formatCompact,
  formatCurrency,
  formatDate,
  formatPercent,
  formatPrice,
  formatQuantity,
} from '@/utils/format';
import { X } from 'lucide-react';

interface PositionDetailProps {
  position: Position;
  orders: RawOrder[];
  history: Map<string, PriceHistory>;
  fx: FxRates;
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
  onClose: () => void;
}

export function PositionDetail({
  position,
  orders,
  history,
  fx,
  arsToUsdRate,
  currency,
  onClose,
}: PositionDetailProps) {
  const { isPrivate } = usePrivacy();
  const isMounted = useMounted();
  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trades = useMemo(
    () => sortOrders(orders.filter((o) => o.Ticker === position.ticker)).reverse(),
    [orders, position.ticker]
  );

  const chartData = useMemo(() => {
    const serie = history.get(position.ticker);
    if (!serie) return [];
    const first =
      trades.length > 0 ? startOfDay(parseOrderDate(trades[trades.length - 1].Concertacion)) : 0;
    const points: { date: string; precio: number }[] = [];
    const day = 24 * 60 * 60 * 1000;
    for (let t = first; t <= startOfDay(new Date()); t += day) {
      const raw = serie.series.at(t);
      if (raw === undefined) continue;
      const usd = serie.currency === 'ARS' ? raw * fx.usdFactorAt(t) : raw;
      const d = new Date(t);
      points.push({
        date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        precio: usd * multiplier,
      });
    }
    return points;
  }, [history, position.ticker, trades, fx, multiplier]);

  const avgPrice = position.averagePrice * multiplier;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${position.ticker}`}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xl"
      >
        <header className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {position.ticker}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{position.especie}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="cursor-pointer p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        <div className="px-6 py-5 space-y-6">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Cantidad', value: formatQuantity(position.quantity) },
              { label: 'Precio promedio', value: formatPrice(avgPrice, currency), hide: true },
              {
                label: 'Precio actual',
                value:
                  position.currentPriceUSD !== undefined
                    ? formatPrice(position.currentPriceUSD * multiplier, currency)
                    : '—',
                hide: true,
              },
              {
                label: 'P&L',
                value:
                  position.pnlAbsolute !== undefined
                    ? `${formatCurrency(position.pnlAbsolute * multiplier, currency, { showSign: true })} (${formatPercent(position.pnlPercentage ?? 0)})`
                    : '—',
                hide: true,
                color:
                  (position.pnlAbsolute ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400',
              },
            ].map((m) => (
              <div key={m.label}>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  {m.label}
                </dt>
                <dd
                  className={`text-sm font-bold tabular-nums mt-0.5 ${m.color ?? 'text-slate-900 dark:text-slate-100'}`}
                >
                  {m.hide && isPrivate ? '***' : m.value}
                </dd>
              </div>
            ))}
          </dl>

          {chartData.length > 1 ? (
            <div className="h-56">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="detailFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      minTickGap={40}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={64}
                      domain={['dataMin', 'dataMax']}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={(v: number) =>
                        isPrivate ? '***' : formatCompact(v, currency)
                      }
                    />
                    <ReferenceLine
                      y={avgPrice}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: 'costo promedio',
                        position: 'insideTopLeft',
                        fill: '#f59e0b',
                        fontSize: 10,
                      }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-lg shadow-lg border border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                            <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                              {isPrivate ? '***' : formatPrice(Number(payload[0].value), currency)}
                            </p>
                          </div>
                        ) : null
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="precio"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#detailFill)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">
              Sin serie de precios para este instrumento.
            </p>
          )}

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-3">
              Operaciones ({trades.length})
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left font-semibold pb-2">Fecha</th>
                  <th className="text-left font-semibold pb-2">Tipo</th>
                  <th className="text-right font-semibold pb-2">Cantidad</th>
                  <th className="text-right font-semibold pb-2">Precio</th>
                  <th className="text-right font-semibold pb-2">Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {trades.map((trade) => {
                  const rate = orderRateToUSD(trade, fx);
                  return (
                    <tr key={trade.id}>
                      <td className="py-2 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(trade.Concertacion)}
                      </td>
                      <td className="py-2">
                        <span
                          className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                            trade.Tipo === 'COMPRA'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}
                        >
                          {trade.Tipo === 'COMPRA' ? 'Compra' : 'Venta'}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatQuantity(trade.Cantidad)}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {isPrivate
                          ? '***'
                          : formatPrice(Number(trade.Precio) * rate * multiplier, currency)}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {isPrivate
                          ? '***'
                          : formatCurrency(Number(trade.Neto) * rate * multiplier, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
