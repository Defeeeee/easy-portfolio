'use client';

import { useMemo } from 'react';
import { Position } from '@/types';
import { TimelinePoint } from '@/utils/timeline';
import { Card } from '@/components/ui/Card';
import { concentrationIndex, maxDrawdown } from '@/utils/stats';
import { formatPercent } from '@/utils/format';

interface RiskCardProps {
  positions: Position[];
  timeline: TimelinePoint[];
  xirr: number | null;
}

const POSITIVE = 'text-emerald-600 dark:text-emerald-400';
const NEGATIVE = 'text-rose-600 dark:text-rose-400';

function concentrationLabel(hhi: number): string {
  if (hhi >= 5000) return 'Muy concentrada';
  if (hhi >= 2500) return 'Concentrada';
  if (hhi >= 1500) return 'Moderada';
  return 'Diversificada';
}

export function RiskCard({ positions, timeline, xirr }: RiskCardProps) {
  const hhi = useMemo(
    () => concentrationIndex(positions.map((p) => p.currentValueUSD ?? p.investedValueUSD)),
    [positions]
  );

  // Sobre el índice time-weighted, no sobre el valor bruto: si no, un retiro
  // grande se contabilizaría como una caída de la cartera.
  const drawdown = useMemo(
    () => maxDrawdown(timeline.map((p) => p.twrIndex).filter((v) => v > 0)),
    [timeline]
  );

  const twrTotal = useMemo(() => {
    const last = timeline[timeline.length - 1];
    return last ? last.twrIndex - 100 : 0;
  }, [timeline]);

  const topWeight = useMemo(() => {
    const values = positions.map((p) => p.currentValueUSD ?? p.investedValueUSD);
    const total = values.reduce((sum, v) => sum + v, 0);
    return total > 0 ? (Math.max(...values, 0) / total) * 100 : 0;
  }, [positions]);

  const metrics = [
    {
      label: 'TIR anualizada',
      value: xirr === null ? '—' : formatPercent(xirr * 100),
      hint:
        xirr === null
          ? 'Necesita aportes con fecha en el archivo'
          : 'Pondera cuándo entró cada aporte',
      color: xirr === null ? '' : xirr >= 0 ? POSITIVE : NEGATIVE,
    },
    {
      label: 'Rendimiento time-weighted',
      value: formatPercent(twrTotal),
      hint: 'Sin el efecto de aportes y retiros',
      color: twrTotal >= 0 ? POSITIVE : NEGATIVE,
    },
    {
      label: 'Máxima caída',
      value: drawdown === 0 ? '—' : `${drawdown.toFixed(1)}%`,
      hint: 'Peor bajada del índice desde un pico previo',
      color: drawdown < 0 ? NEGATIVE : '',
    },
    {
      label: 'Concentración',
      value: concentrationLabel(hhi),
      hint: `HHI ${Math.round(hhi).toLocaleString('es-AR')} · mayor posición ${topWeight.toFixed(0)}%`,
      color: '',
    },
  ];

  return (
    <Card title="Riesgo y retorno" subtitle="Cómo se comportó la cartera, no sólo cuánto ganó">
      <dl className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              {metric.label}
            </dt>
            <dd
              className={`text-xl font-bold tracking-tight tabular-nums mt-0.5 ${
                metric.color || 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {metric.value}
            </dd>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{metric.hint}</p>
          </div>
        ))}
      </dl>
    </Card>
  );
}
