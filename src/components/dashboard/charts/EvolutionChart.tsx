'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TimelinePoint } from '@/utils/timeline';
import { usePrivacy } from '@/context/PrivacyContext';
import { useMounted } from '@/hooks/useMounted';
import { formatCompact, formatCurrency, formatPercent } from '@/utils/format';

interface EvolutionChartProps {
  timeline: TimelinePoint[];
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
  benchmarkLabel?: string;
  /** Aviso cuando parte de la serie se estimó con precios de operación. */
  estimatedTickers?: string[];
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const RANGES: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

function cutoffFor(range: TimeRange): number {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  switch (range) {
    case '1M':
      cutoff.setMonth(cutoff.getMonth() - 1);
      break;
    case '3M':
      cutoff.setMonth(cutoff.getMonth() - 3);
      break;
    case '6M':
      cutoff.setMonth(cutoff.getMonth() - 6);
      break;
    case '1Y':
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      break;
    default:
      return 0;
  }
  return cutoff.getTime();
}

function formatXAxis(dateStr: string): string {
  const parts = dateStr.split('/');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : dateStr;
}

export function EvolutionChart({
  timeline,
  arsToUsdRate,
  currency,
  benchmarkLabel,
  estimatedTickers = [],
}: EvolutionChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [showBenchmark, setShowBenchmark] = useState(true);
  const { isPrivate } = usePrivacy();
  const isMounted = useMounted();

  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;
  const hasBenchmark = useMemo(
    () => timeline.some((p) => p.benchmarkUSD !== undefined && p.benchmarkUSD > 0),
    [timeline]
  );

  const displayData = useMemo(() => {
    if (timeline.length === 0) return [];
    const cutoff = cutoffFor(timeRange);
    const filtered = cutoff > 0 ? timeline.filter((p) => p.timestamp >= cutoff) : timeline;
    const source = filtered.length > 0 ? filtered : timeline;

    return source.map((point) => ({
      date: point.date,
      timestamp: point.timestamp,
      Invertido: point.investedUSD * multiplier,
      Actual: point.actualValueUSD * multiplier,
      Benchmark:
        showBenchmark && point.benchmarkUSD !== undefined
          ? point.benchmarkUSD * multiplier
          : undefined,
    }));
  }, [timeline, timeRange, multiplier, showBenchmark]);

  if (displayData.length === 0) return null;

  const formatYAxis = (value: number) => (isPrivate ? '***' : formatCompact(value, currency));

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden dark:bg-slate-900 dark:border-slate-800">
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Evolución del portafolio
          </h3>
          <div className="flex items-center flex-wrap gap-4 text-xs mt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block" />
              <span className="text-slate-600 font-medium dark:text-slate-300">Valor actual</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block" />
              <span className="text-slate-500 font-medium dark:text-slate-400">
                Capital invertido
              </span>
            </span>
            {hasBenchmark && (
              <button
                onClick={() => setShowBenchmark((v) => !v)}
                className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
                  showBenchmark ? '' : 'opacity-40'
                }`}
                title="Los mismos aportes, en las mismas fechas, invertidos en el benchmark"
              >
                <span className="w-3 h-0.5 bg-indigo-400 rounded-full inline-block" />
                <span className="text-slate-500 font-medium dark:text-slate-400">
                  {benchmarkLabel ?? 'Benchmark'}
                </span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg self-start md:self-auto dark:bg-slate-800/60">
          {RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${
                timeRange === range
                  ? 'text-slate-900 font-semibold bg-white shadow-xs dark:text-slate-100 dark:bg-slate-900'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 h-96 w-full">
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickFormatter={formatXAxis}
                minTickGap={30}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickFormatter={formatYAxis}
                width={80}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const get = (key: string) =>
                    payload.find((p) => p.dataKey === key)?.value as number | undefined;

                  const actual = get('Actual');
                  const invertido = get('Invertido');
                  const bench = get('Benchmark');
                  if (actual === undefined || invertido === undefined) return null;

                  const pnl = actual - invertido;
                  const pnlPct = invertido > 0 ? (pnl / invertido) * 100 : 0;

                  const row = (
                    marker: React.ReactNode,
                    name: string,
                    value: number,
                    bold = false
                  ) => (
                    <div className="flex items-center justify-between gap-6">
                      <span className="flex items-center gap-1.5">
                        {marker}
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {name}
                        </span>
                      </span>
                      <span
                        className={`text-sm tabular-nums ${bold ? 'font-bold text-slate-800 dark:text-slate-200' : 'font-semibold text-slate-600 dark:text-slate-300'}`}
                      >
                        {isPrivate ? '***' : formatCurrency(value, currency)}
                      </span>
                    </div>
                  );

                  return (
                    <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-lg min-w-[240px] space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
                      <p className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-1.5 dark:text-slate-200 dark:border-slate-800">
                        {label}
                      </p>
                      {row(
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />,
                        'Valor actual',
                        actual,
                        true
                      )}
                      {row(
                        <span className="w-2.5 h-0.5 border-t border-dashed border-amber-500" />,
                        'Cap. invertido',
                        invertido
                      )}
                      {bench !== undefined &&
                        row(
                          <span className="w-2.5 h-0.5 bg-indigo-400" />,
                          benchmarkLabel ?? 'Benchmark',
                          bench
                        )}
                      <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-2 dark:border-slate-800">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Rendimiento
                        </span>
                        <span
                          className={`text-xs font-bold tabular-nums ${pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                        >
                          {isPrivate
                            ? '***'
                            : `${formatCurrency(pnl, currency, { showSign: true })} (${formatPercent(pnlPct)})`}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="Invertido"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={0}
                name="Capital invertido"
                isAnimationActive={false}
              />
              {hasBenchmark && showBenchmark && (
                <Line
                  type="monotone"
                  dataKey="Benchmark"
                  stroke="#818cf8"
                  strokeWidth={1.5}
                  dot={false}
                  name={benchmarkLabel ?? 'Benchmark'}
                  isAnimationActive={false}
                  connectNulls
                />
              )}
              <Area
                type="monotone"
                dataKey="Actual"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorActual)"
                name="Valor actual"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {estimatedTickers.length > 0 && (
        <p className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400 dark:text-slate-500 dark:border-slate-800">
          Sin serie de mercado para {estimatedTickers.join(', ')}: esos tramos se interpolan entre
          tus propios precios de operación.
        </p>
      )}
    </div>
  );
}
