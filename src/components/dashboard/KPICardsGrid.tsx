'use client';

import { useMemo } from 'react';
import { Position } from '@/types';
import { KPICard } from '@/components/dashboard/charts/KPICard';
import { AnimatedCurrency } from '@/components/ui/AnimatedCurrency';
import { usePrivacy } from '@/context/PrivacyContext';

interface KPICardsGridProps {
  positions: Position[];
  globalCurrency: 'USD' | 'ARS';
  totalInvested: number;
  currentTotalValue: number;
  totalPnlAbsolute: number;
  totalPnlPercentage: number;
}

export function KPICardsGrid({
  positions,
  globalCurrency,
  totalInvested,
  currentTotalValue,
  totalPnlAbsolute,
  totalPnlPercentage,
}: KPICardsGridProps) {
  const { isPrivate } = usePrivacy();

  // Calculate best performing asset (highest P&L percentage)
  const bestAsset = useMemo(() => {
    if (positions.length === 0) return null;
    return positions.reduce((best, current) => {
      const currentPct = current.pnlPercentage ?? 0;
      const bestPct = best.pnlPercentage ?? 0;
      return currentPct > bestPct ? current : best;
    }, positions[0]);
  }, [positions]);

  // Calculate worst performing asset (lowest P&L percentage)
  const worstAsset = useMemo(() => {
    if (positions.length === 0) return null;
    return positions.reduce((worst, current) => {
      const currentPct = current.pnlPercentage ?? 0;
      const worstPct = worst.pnlPercentage ?? 0;
      return currentPct < worstPct ? current : worst;
    }, positions[0]);
  }, [positions]);

  // Formatter for Best/Worst badge text
  const getBadgeText = (pos: Position | null) => {
    if (!pos) return undefined;
    if (isPrivate) return '***';
    const pct = pos.pnlPercentage ?? 0;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
      <KPICard
        title="Total Invertido"
        tooltip="Suma del costo de compra de todas tus posiciones abiertas, calculado en base a tus operaciones históricas."
        value={<AnimatedCurrency value={totalInvested} currency={globalCurrency} />}
      />
      <KPICard
        title="Valor Actual"
        tooltip="Valuación de mercado de tu portfolio al precio actual de cada activo."
        value={<AnimatedCurrency value={currentTotalValue} currency={globalCurrency} />}
      />
      <KPICard
        title="P&L Latente"
        tooltip="Ganancia o pérdida no realizada: diferencia entre el valor actual del portfolio y su costo de compra total. No incluye operaciones ya cerradas."
        value={<AnimatedCurrency value={totalPnlAbsolute} currency={globalCurrency} showSign />}
        valueColor={totalPnlAbsolute >= 0 ? 'text-emerald-600' : 'text-red-600'}
        badge={`${totalPnlPercentage >= 0 ? '+' : ''}${totalPnlPercentage.toFixed(2)}%`}
        badgeColor={
          totalPnlAbsolute >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        }
      />
      <KPICard
        title="Mejor Activo"
        tooltip="El activo con mayor rendimiento porcentual desde su precio de compra promedio hasta el precio actual."
        value={bestAsset ? (isPrivate ? '***' : bestAsset.ticker) : '-'}
        badge={getBadgeText(bestAsset)}
        badgeColor={
          bestAsset && (bestAsset.pnlPercentage ?? 0) >= 0
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-red-100 text-red-700'
        }
      />
      <KPICard
        title="Peor Activo"
        tooltip="El activo con menor rendimiento porcentual desde su precio de compra promedio hasta el precio actual."
        value={worstAsset ? (isPrivate ? '***' : worstAsset.ticker) : '-'}
        badge={getBadgeText(worstAsset)}
        badgeColor={
          worstAsset && (worstAsset.pnlPercentage ?? 0) >= 0
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-red-100 text-red-700'
        }
      />
    </div>
  );
}
