'use client';

import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CustomTooltip } from '@/components/dashboard/charts/CustomTooltip';
import { COLORS } from '@/constants/colors';
import { useMounted } from '@/hooks/useMounted';
import { usePrivacy } from '@/context/PrivacyContext';
import { formatCompact } from '@/utils/format';

export interface DonutSlice {
  name: string;
  value: number;
}

interface DonutChartProps {
  data: DonutSlice[];
  currency: 'USD' | 'ARS';
  centerLabel?: string;
}

export function DonutChart({ data, currency, centerLabel = 'Total' }: DonutChartProps) {
  const isMounted = useMounted();
  const { isPrivate } = usePrivacy();

  const slices = useMemo(
    () =>
      [...data]
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .map((d, index) => ({ ...d, fill: COLORS[index % COLORS.length] })),
    [data]
  );

  const total = useMemo(() => slices.reduce((sum, s) => sum + s.value, 0), [slices]);

  if (slices.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-16 text-center dark:text-slate-500">
        Sin datos para graficar.
      </p>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-[190px] h-[190px] shrink-0">
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {slices.map((slice) => (
                  <Cell key={slice.name} fill={slice.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip totalValue={total} currency={currency} />} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            {centerLabel}
          </span>
          <span className="text-base font-bold text-slate-800 tabular-nums dark:text-slate-200">
            {isPrivate ? '***' : formatCompact(total, currency)}
          </span>
        </div>
      </div>

      <ul className="flex-1 w-full space-y-2">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: slice.fill }}
            />
            <span className="text-slate-600 truncate flex-1 dark:text-slate-300">{slice.name}</span>
            <span className="text-slate-400 tabular-nums shrink-0 dark:text-slate-500">
              {total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0.0'}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
