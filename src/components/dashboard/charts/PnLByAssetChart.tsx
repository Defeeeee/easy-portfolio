'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { Position } from '@/types';
import { Card } from '@/components/ui/Card';
import { useMounted } from '@/hooks/useMounted';
import { usePrivacy } from '@/context/PrivacyContext';
import { formatCompact, formatCurrency, formatPercent } from '@/utils/format';

interface PnLByAssetChartProps {
  positions: Position[];
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
}

const POSITIVE = '#10b981';
const NEGATIVE = '#f43f5e';

export function PnLByAssetChart({ positions, arsToUsdRate, currency }: PnLByAssetChartProps) {
  const isMounted = useMounted();
  const { isPrivate } = usePrivacy();

  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;

  const data = useMemo(
    () =>
      positions
        .filter((p) => p.pnlAbsolute !== undefined)
        .map((p) => ({
          ticker: p.ticker,
          pnl: (p.pnlAbsolute ?? 0) * multiplier,
          pct: p.pnlPercentage ?? 0,
        }))
        .sort((a, b) => b.pnl - a.pnl),
    [positions, multiplier]
  );

  if (data.length === 0) {
    return (
      <Card title="P&L por activo">
        <p className="text-sm text-slate-400 py-12 text-center">
          Ninguna posición tiene precio de mercado para comparar.
        </p>
      </Card>
    );
  }

  const height = Math.max(200, data.length * 44);

  return (
    <Card title="P&L por activo" subtitle="Resultado no realizado de cada tenencia abierta">
      <div style={{ height }}>
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 88, bottom: 4, left: 0 }}
            >
              {/* El dominio tiene que incluir el cero: si no, con todos los P&L
                  del mismo signo la barra más chica queda con ancho cero. */}
              <XAxis
                type="number"
                hide
                domain={[
                  (min: number) => Math.min(0, min) * 1.05,
                  (max: number) => Math.max(0, max) * 1.05,
                ]}
              />
              <YAxis
                type="category"
                dataKey="ticker"
                axisLine={false}
                tickLine={false}
                width={80}
                tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
              />
              <ReferenceLine x={0} stroke="#e2e8f0" />
              <Bar dataKey="pnl" radius={3} barSize={18} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.ticker} fill={d.pnl >= 0 ? POSITIVE : NEGATIVE} />
                ))}
                <LabelList
                  dataKey="pnl"
                  position="right"
                  className="fill-slate-500"
                  fontSize={11}
                  formatter={(value) =>
                    isPrivate ? '***' : formatCompact(Number(value ?? 0), currency)
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <ul className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
        {data.map((d) => (
          <li key={d.ticker} className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-600">{d.ticker}</span>
            <span className="font-mono tabular-nums text-slate-500">
              {isPrivate ? '***' : formatCurrency(d.pnl, currency, { showSign: true })}
              <span className={`ml-2 ${d.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatPercent(d.pct)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
