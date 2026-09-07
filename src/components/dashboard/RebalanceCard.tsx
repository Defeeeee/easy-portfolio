'use client';

import { useMemo, useState } from 'react';
import { Position } from '@/types';
import { Card } from '@/components/ui/Card';
import { rebalance } from '@/utils/simulate';
import { usePrivacy } from '@/context/PrivacyContext';
import { formatCurrency } from '@/utils/format';
import { RotateCcw } from 'lucide-react';

interface RebalanceCardProps {
  positions: Position[];
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
}

export function RebalanceCard({ positions, arsToUsdRate, currency }: RebalanceCardProps) {
  const { isPrivate } = usePrivacy();
  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;

  const currentWeights = useMemo(() => {
    const total = positions.reduce((s, p) => s + (p.currentValueUSD ?? p.investedValueUSD), 0);
    return Object.fromEntries(
      positions.map((p) => [
        p.ticker,
        total > 0 ? ((p.currentValueUSD ?? p.investedValueUSD) / total) * 100 : 0,
      ])
    );
  }, [positions]);

  const [targets, setTargets] = useState<Record<string, number>>(currentWeights);

  const actions = useMemo(() => rebalance(positions, targets), [positions, targets]);
  const totalTarget = Object.values(targets).reduce((s, v) => s + v, 0);
  const offBy = totalTarget - 100;

  const equalWeight = () => {
    const share = 100 / positions.length;
    setTargets(Object.fromEntries(positions.map((p) => [p.ticker, share])));
  };

  return (
    <Card
      title="Calculadora de rebalanceo"
      subtitle="Definí los pesos objetivo y te dice cuánto comprar o vender"
      action={
        <div className="flex items-center gap-1">
          <button
            onClick={equalWeight}
            className="cursor-pointer text-[11px] font-semibold px-2 py-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Equiponderar
          </button>
          <button
            onClick={() => setTargets(currentWeights)}
            aria-label="Volver a los pesos actuales"
            className="cursor-pointer p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      }
      footer={
        <p
          className={`text-[11px] tabular-nums ${
            Math.abs(offBy) < 0.05
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-amber-600 dark:text-amber-400 font-semibold'
          }`}
        >
          {Math.abs(offBy) < 0.05
            ? 'Los pesos objetivo suman 100%.'
            : `Los pesos objetivo suman ${totalTarget.toFixed(1)}%: ${offBy > 0 ? 'sobra' : 'falta'} ${Math.abs(offBy).toFixed(1)}%.`}
        </p>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
            <th className="text-left font-semibold pb-2">Ticker</th>
            <th className="text-right font-semibold pb-2">Hoy</th>
            <th className="text-right font-semibold pb-2 w-24">Objetivo</th>
            <th className="text-right font-semibold pb-2">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
          {actions.map((action) => (
            <tr key={action.ticker}>
              <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-200">
                {action.ticker}
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {action.currentWeight.toFixed(1)}%
              </td>
              <td className="py-2.5 text-right">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={Number(targets[action.ticker] ?? 0).toFixed(0)}
                  onChange={(e) =>
                    setTargets((prev) => ({
                      ...prev,
                      [action.ticker]: Math.max(0, Math.min(100, Number(e.target.value))),
                    }))
                  }
                  aria-label={`Peso objetivo de ${action.ticker}`}
                  className="w-16 text-right font-mono tabular-nums text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2 py-1"
                />
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                {Math.abs(action.deltaUSD) < 0.5 ? (
                  <span className="text-slate-300 dark:text-slate-600">—</span>
                ) : (
                  <span
                    className={
                      action.deltaUSD > 0
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-rose-600 dark:text-rose-400 font-semibold'
                    }
                  >
                    {action.deltaUSD > 0 ? 'Comprar ' : 'Vender '}
                    {isPrivate
                      ? '***'
                      : formatCurrency(Math.abs(action.deltaUSD) * multiplier, currency, {
                          decimals: 0,
                        })}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
