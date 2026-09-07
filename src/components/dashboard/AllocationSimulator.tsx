'use client';

import { useMemo, useState } from 'react';
import { Position } from '@/types';
import { Card } from '@/components/ui/Card';
import { FxRates } from '@/utils/fx';
import { PriceHistory } from '@/utils/timeline';
import { simulateAllocation } from '@/utils/simulate';
import { usePrivacy } from '@/context/PrivacyContext';
import { formatCurrency, formatPercent } from '@/utils/format';
import { BENCHMARKS, benchmarkByKey } from '@/constants/benchmarks';
import { AlertTriangle } from 'lucide-react';

interface AllocationSimulatorProps {
  positions: Position[];
  history: Map<string, PriceHistory>;
  benchmarks: Map<string, PriceHistory>;
  fx: FxRates;
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
}

const STEPS = [0, 10, 25, 50, 75, 100];

export function AllocationSimulator({
  positions,
  history,
  benchmarks,
  fx,
  arsToUsdRate,
  currency,
}: AllocationSimulatorProps) {
  const { isPrivate } = usePrivacy();
  const [share, setShare] = useState(0);
  const [targetKey, setTargetKey] = useState('spy');
  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;

  const target = benchmarks.get(targetKey);

  const rows = useMemo(() => {
    if (!target) return [];
    return simulateAllocation({
      positions,
      history,
      target,
      fx,
      shares: STEPS.map((s) => s / 100),
    });
  }, [positions, history, target, fx]);

  const current = rows.find((r) => Math.abs(r.share * 100 - share) < 0.001) ?? rows[0];
  const base = rows[0];

  if (rows.length === 0) {
    return (
      <Card title="Simulador de asignación">
        <p className="text-sm text-slate-400 dark:text-slate-500 py-10 text-center">
          Hace falta un fondo común en cartera y al menos un mes de cotizaciones para simular.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Simulador de asignación"
      subtitle="Qué habría pasado con tus tenencias actuales durante el último año"
      action={
        <select
          value={targetKey}
          onChange={(e) => setTargetKey(e.target.value)}
          className="text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-2 py-1 cursor-pointer"
        >
          {BENCHMARKS.filter((b) => benchmarks.has(b.key)).map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </select>
      }
      footer={
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Un año de historia es una muestra corta y puede no incluir ninguna caída seria. No
            extrapoles estos números a decisiones de largo plazo.
          </p>
        </div>
      }
    >
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <label htmlFor="share" className="text-xs text-slate-500 dark:text-slate-400">
            Mover del fondo común a {benchmarkByKey(targetKey).label}
          </label>
          <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200">
            {share}%
          </span>
        </div>
        <input
          id="share"
          type="range"
          min={0}
          max={100}
          step={1}
          value={share}
          onChange={(e) => setShare(Number(e.target.value))}
          list="allocation-steps"
          className="w-full cursor-pointer accent-emerald-500"
        />
        <datalist id="allocation-steps">
          {STEPS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      {current && base && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Monto movido',
              value: isPrivate
                ? '***'
                : formatCurrency(current.movedUSD * multiplier, currency, { decimals: 0 }),
              delta: null,
            },
            {
              label: 'En acciones',
              value: `${current.equityWeight.toFixed(1)}%`,
              delta: current.equityWeight - base.equityWeight,
            },
            {
              label: 'Volatilidad',
              value: `${current.volatilityPct.toFixed(1)}%`,
              delta: current.volatilityPct - base.volatilityPct,
            },
            {
              label: 'Peor caída',
              value: `${current.maxDrawdownPct.toFixed(1)}%`,
              delta: current.maxDrawdownPct - base.maxDrawdownPct,
            },
          ].map((m) => (
            <div key={m.label}>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                {m.label}
              </dt>
              <dd className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                {m.value}
              </dd>
              {m.delta !== null && Math.abs(m.delta) > 0.05 && (
                <p className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                  {formatPercent(m.delta, 1)} vs hoy
                </p>
              )}
            </div>
          ))}
        </dl>
      )}

      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              <th className="text-left font-semibold pb-2">Mover</th>
              <th className="text-right font-semibold pb-2">En acciones</th>
              <th className="text-right font-semibold pb-2">Volatilidad</th>
              <th className="text-right font-semibold pb-2">Peor caída</th>
              <th className="text-right font-semibold pb-2">Resultado 12m</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {rows.map((row) => (
              <tr
                key={row.share}
                className={
                  Math.abs(row.share * 100 - share) < 0.001
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
                    : ''
                }
              >
                <td className="py-2 font-semibold text-slate-700 dark:text-slate-200">
                  {(row.share * 100).toFixed(0)}%
                </td>
                <td className="py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                  {row.equityWeight.toFixed(1)}%
                </td>
                <td className="py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                  {row.volatilityPct.toFixed(1)}%
                </td>
                <td className="py-2 text-right tabular-nums text-rose-600 dark:text-rose-400">
                  {row.maxDrawdownPct.toFixed(1)}%
                </td>
                <td className="py-2 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                  {formatPercent(row.returnPct, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
