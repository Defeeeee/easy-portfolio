'use client';

import { useMemo } from 'react';
import { Position } from '@/types';
import { Card } from '@/components/ui/Card';
import { DonutChart } from '@/components/dashboard/charts/DonutChart';

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
  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;

  const data = useMemo(
    () =>
      positions.map((pos) => ({
        name: pos.ticker,
        value: (pos.currentValueUSD ?? pos.investedValueUSD) * multiplier,
      })),
    [positions, multiplier]
  );

  return (
    <Card title="Distribución por ticker" subtitle="Sobre el valor actual de cada tenencia">
      <DonutChart data={data} currency={currency} centerLabel="Cartera" />
    </Card>
  );
}
