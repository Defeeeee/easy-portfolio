'use client';

import { PortfolioStats } from '@/types';
import { Card } from '@/components/ui/Card';
import { usePrivacy } from '@/context/PrivacyContext';
import { formatCurrency } from '@/utils/format';

interface FiscalYearsCardProps {
  stats: PortfolioStats;
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
}

export function FiscalYearsCard({ stats, arsToUsdRate, currency }: FiscalYearsCardProps) {
  const { isPrivate } = usePrivacy();
  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;
  const years = stats.fiscalYears;

  if (years.length === 0) return null;

  return (
    <Card
      title="Resultado por año fiscal"
      subtitle="Ventas cerradas y costos operativos de cada año"
      footer={
        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
          Orientativo. El criterio impositivo puede diferir del costo promedio ponderado que usa
          esta vista, y no contempla exenciones ni ajuste por inflación.
        </p>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
            <th className="text-left font-semibold pb-2">Año</th>
            <th className="text-right font-semibold pb-2">Ventas</th>
            <th className="text-right font-semibold pb-2">Costos</th>
            <th className="text-right font-semibold pb-2">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
          {years.map((year) => (
            <tr key={year.year}>
              <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-200">
                {year.year}
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {year.trades}
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {isPrivate ? '***' : formatCurrency(year.costsUSD * multiplier, currency)}
              </td>
              <td
                className={`py-2.5 text-right font-mono tabular-nums font-semibold ${
                  year.realizedUSD >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {isPrivate
                  ? '***'
                  : formatCurrency(year.realizedUSD * multiplier, currency, { showSign: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
