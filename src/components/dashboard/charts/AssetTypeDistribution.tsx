'use client';

import { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Position } from '@/types';
import { ASSET_TYPES } from '@/utils/assetTypes';
import { Info } from 'lucide-react';
import { CustomTooltip } from '@/components/dashboard/charts/CustomTooltip';
import { COLORS } from '@/constants/colors';

interface AssetTypeDistributionProps {
  positions: Position[];
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
}

export function AssetTypeDistribution({
  positions,
  arsToUsdRate,
  currency,
}: AssetTypeDistributionProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const data = useMemo(() => {
    const typeMap = new Map<string, number>();

    positions.forEach((pos) => {
      const val =
        currency === 'USD'
          ? (pos.currentValueUSD ?? pos.investedValueUSD)
          : (pos.currentValueUSD ?? pos.investedValueUSD) * arsToUsdRate;
      const currentVal = typeMap.get(pos.assetType) || 0;
      typeMap.set(pos.assetType, currentVal + val);
    });

    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .map((item, index) => ({
        ...item,
        fill: COLORS[index % COLORS.length],
      }));
  }, [positions, currency, arsToUsdRate]);

  const totalValue = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  const unknownPositions = useMemo(
    () => positions.filter((p) => p.assetType === ASSET_TYPES.OTRO),
    [positions]
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Distribución por Tipo de Activo
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

      {unknownPositions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2">
          <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">Sin clasificar: </span>
            {unknownPositions.map((p) => p.ticker).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
