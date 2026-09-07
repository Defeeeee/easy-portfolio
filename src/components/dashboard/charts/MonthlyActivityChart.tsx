'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MonthlyActivity } from '@/types';
import { Card } from '@/components/ui/Card';
import { useMounted } from '@/hooks/useMounted';
import { usePrivacy } from '@/context/PrivacyContext';
import { formatCompact, formatCurrency } from '@/utils/format';

interface MonthlyActivityChartProps {
  monthly: MonthlyActivity[];
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
}

export function MonthlyActivityChart({
  monthly,
  arsToUsdRate,
  currency,
}: MonthlyActivityChartProps) {
  const isMounted = useMounted();
  const { isPrivate } = usePrivacy();

  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;

  const data = useMemo(
    () =>
      monthly.map((m) => ({
        label: m.label,
        Compras: m.buysUSD * multiplier,
        Ventas: m.sellsUSD * multiplier,
        trades: m.trades,
      })),
    [monthly, multiplier]
  );

  const totalTrades = monthly.reduce((sum, m) => sum + m.trades, 0);

  return (
    <Card
      title="Actividad mensual"
      subtitle={`${totalTrades} operaciones en ${monthly.length} ${monthly.length === 1 ? 'mes' : 'meses'}`}
    >
      <div className="h-[280px]">
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={62}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(v: number) => (isPrivate ? '***' : formatCompact(v, currency))}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-800 mb-2 dark:text-slate-200">
                        {label}
                      </p>
                      {payload.map((entry) => (
                        <p
                          key={entry.name}
                          className="text-sm text-slate-600 flex gap-3 dark:text-slate-300"
                        >
                          <span className="w-16" style={{ color: entry.color }}>
                            {entry.name}
                          </span>
                          <span className="font-mono tabular-nums">
                            {isPrivate
                              ? '***'
                              : formatCurrency(Number(entry.value ?? 0), currency, { decimals: 0 })}
                          </span>
                        </p>
                      ))}
                      <p className="text-xs text-slate-400 mt-1.5 dark:text-slate-500">
                        {payload[0]?.payload?.trades} operaciones
                      </p>
                    </div>
                  );
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>
                )}
              />
              <Bar dataKey="Compras" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Ventas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
