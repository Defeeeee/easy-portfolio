'use client';

import { Position, PortfolioStats } from '@/types';
import { KPICard } from '@/components/dashboard/charts/KPICard';
import { AnimatedCurrency } from '@/components/ui/AnimatedCurrency';
import { formatPercent } from '@/utils/format';

interface KPICardsGridProps {
  positions: Position[];
  stats: PortfolioStats | null;
  globalCurrency: 'USD' | 'ARS';
  currencyMultiplier: number;
  totalInvested: number;
  currentTotalValue: number;
  totalPnlAbsolute: number;
  totalPnlPercentage: number;
}

const POSITIVE_BADGE = 'bg-emerald-50 text-emerald-700';
const NEGATIVE_BADGE = 'bg-rose-50 text-rose-700';

const badgeFor = (value: number) => (value >= 0 ? POSITIVE_BADGE : NEGATIVE_BADGE);
const colorFor = (value: number) => (value >= 0 ? 'text-emerald-600' : 'text-rose-600');

export function KPICardsGrid({
  positions,
  stats,
  globalCurrency,
  currencyMultiplier,
  totalInvested,
  currentTotalValue,
  totalPnlAbsolute,
  totalPnlPercentage,
}: KPICardsGridProps) {
  const realizedPnl = (stats?.realizedPnlUSD ?? 0) * currencyMultiplier;
  const realizedPct = stats?.realizedPnlPercentage ?? 0;
  const combinedPnl = totalPnlAbsolute + realizedPnl;
  const combinedPct = totalInvested > 0 ? (combinedPnl / totalInvested) * 100 : 0;

  const valuedPositions = positions.filter((p) => p.currentValueUSD !== undefined).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <KPICard
        title="Valor Actual"
        emphasis
        value={<AnimatedCurrency value={currentTotalValue} currency={globalCurrency} />}
        hint={`${valuedPositions} de ${positions.length} posiciones con precio`}
      />
      <KPICard
        title="Total Invertido"
        value={<AnimatedCurrency value={totalInvested} currency={globalCurrency} />}
        hint="Costo de las tenencias abiertas"
      />
      <KPICard
        title="P&L Latente"
        value={<AnimatedCurrency value={totalPnlAbsolute} currency={globalCurrency} showSign />}
        valueColor={colorFor(totalPnlAbsolute)}
        badge={formatPercent(totalPnlPercentage)}
        badgeColor={badgeFor(totalPnlAbsolute)}
        hint="Sobre posiciones abiertas"
      />
      <KPICard
        title="P&L Realizado"
        value={<AnimatedCurrency value={realizedPnl} currency={globalCurrency} showSign />}
        valueColor={colorFor(realizedPnl)}
        badge={formatPercent(realizedPct)}
        badgeColor={badgeFor(realizedPnl)}
        hint={`${stats?.closedTrades.length ?? 0} operaciones cerradas`}
      />
      <KPICard
        title="Resultado Total"
        value={<AnimatedCurrency value={combinedPnl} currency={globalCurrency} showSign />}
        valueColor={colorFor(combinedPnl)}
        badge={formatPercent(combinedPct)}
        badgeColor={badgeFor(combinedPnl)}
        hint="Latente + realizado"
      />
    </div>
  );
}
