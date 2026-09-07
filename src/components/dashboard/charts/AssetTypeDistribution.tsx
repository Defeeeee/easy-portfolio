'use client';

import { useMemo } from 'react';
import { Position } from '@/types';
import { ASSET_TYPES } from '@/utils/assetTypes';
import { Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DonutChart } from '@/components/dashboard/charts/DonutChart';

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
  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;

  const data = useMemo(() => {
    const typeMap = new Map<string, number>();
    positions.forEach((pos) => {
      const value = (pos.currentValueUSD ?? pos.investedValueUSD) * multiplier;
      typeMap.set(pos.assetType, (typeMap.get(pos.assetType) ?? 0) + value);
    });
    return Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));
  }, [positions, multiplier]);

  const unknownPositions = useMemo(
    () => positions.filter((p) => p.assetType === ASSET_TYPES.OTRO),
    [positions]
  );

  return (
    <Card
      title="Distribución por tipo de activo"
      subtitle="Cómo se reparte la cartera entre clases"
      footer={
        unknownPositions.length > 0 ? (
          <div className="flex items-start gap-2">
            <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-700">Sin clasificar: </span>
              {unknownPositions.map((p) => p.ticker).join(', ')}
            </p>
          </div>
        ) : undefined
      }
    >
      <DonutChart data={data} currency={currency} centerLabel="Cartera" />
    </Card>
  );
}
