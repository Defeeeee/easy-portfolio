'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Position } from '@/types';
import { CustomTooltip } from '@/components/dashboard/charts/CustomTooltip';
import { COLORS } from '@/constants/colors';

interface PortfolioDistributionProps {
  positions: Position[];
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
}

export function PortfolioDistribution({
  positions,
  arsToUsdRate,
  currency,
}: PortfolioDistributionProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const data = positions.map((pos, index) => ({
    name: pos.ticker,
    value: currency === 'USD' ? pos.investedValueUSD : pos.investedValueUSD * arsToUsdRate,
    fill: COLORS[index % COLORS.length],
  }));

  const totalValue = React.useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Distribución por Ticker
        </h3>
      </div>
      <div className="flex-1 min-h-[300px]">
        {!isMounted ? null : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              />
              <Tooltip content={<CustomTooltip totalValue={totalValue} />} />
              <Legend
                verticalAlign="bottom"
                height={40}
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
