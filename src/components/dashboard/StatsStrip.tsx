'use client';

import { useMemo } from 'react';
import { PortfolioStats } from '@/types';
import { usePrivacy } from '@/context/PrivacyContext';
import { formatCurrency, formatDate } from '@/utils/format';

interface StatsStripProps {
  stats: PortfolioStats;
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
  openPositions: number;
  /** Inflación acumulada del período, para leer el resultado en pesos reales. */
  inflationPct?: number | null;
}

interface Metric {
  label: string;
  value: string;
  hint?: string;
  private?: boolean;
}

export function StatsStrip({
  stats,
  arsToUsdRate,
  currency,
  openPositions,
  inflationPct,
}: StatsStripProps) {
  const { isPrivate } = usePrivacy();
  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;

  const metrics = useMemo<Metric[]>(() => {
    const winners = stats.closedTrades.filter((t) => t.pnlUSD > 0).length;
    const winRate = stats.closedTrades.length ? (winners / stats.closedTrades.length) * 100 : null;

    return [
      {
        label: 'Operaciones',
        value: String(stats.totalOrders),
        hint: `${stats.buyOrders} compras · ${stats.sellOrders} ventas`,
      },
      {
        label: 'Volumen operado',
        value: formatCurrency(stats.volumeUSD * multiplier, currency, { decimals: 0 }),
        hint: 'Suma de netos comprados y vendidos',
        private: true,
      },
      {
        label: 'Costos totales',
        value: formatCurrency(stats.costs.totalUSD * multiplier, currency, { decimals: 2 }),
        hint: `${stats.costs.costRatio.toFixed(2)}% del bruto operado`,
        private: true,
      },
      {
        label: 'Posiciones abiertas',
        value: String(openPositions),
        hint: stats.mostTradedTicker ? `Más operado: ${stats.mostTradedTicker}` : undefined,
      },
      {
        label: 'Operaciones cerradas',
        value: String(stats.closedTrades.length),
        hint: winRate !== null ? `${winRate.toFixed(0)}% en ganancia` : undefined,
      },
      {
        label: 'Inflación del período',
        value:
          inflationPct === null || inflationPct === undefined ? '—' : `${inflationPct.toFixed(1)}%`,
        hint: 'Lo que tuvo que rendir en pesos para no perder',
      },
      {
        label: 'Período',
        value: `${stats.daysActive} días`,
        hint:
          stats.firstDate && stats.lastDate
            ? `${formatDate(stats.firstDate)} → ${formatDate(stats.lastDate)}`
            : undefined,
      },
    ];
  }, [stats, multiplier, currency, openPositions, inflationPct]);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 divide-y divide-x divide-slate-100 overflow-hidden dark:bg-slate-900 dark:border-slate-800 dark:divide-slate-800">
      {metrics.map((metric) => (
        <div key={metric.label} className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            {metric.label}
          </p>
          <p className="text-lg font-bold tracking-tight text-slate-900 mt-1 tabular-nums dark:text-slate-100">
            {metric.private && isPrivate ? '***' : metric.value}
          </p>
          {metric.hint && (
            <p className="text-[11px] text-slate-400 mt-0.5 dark:text-slate-500">{metric.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}
