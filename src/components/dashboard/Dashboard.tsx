'use client';

import { useMemo, useState } from 'react';
import { PortfolioStats, Position, RawOrder } from '@/types';
import { PortfolioDistribution } from '@/components/dashboard/charts/PortfolioDistribution';
import { AssetTypeDistribution } from '@/components/dashboard/charts/AssetTypeDistribution';
import { PnLByAssetChart } from '@/components/dashboard/charts/PnLByAssetChart';
import { MonthlyActivityChart } from '@/components/dashboard/charts/MonthlyActivityChart';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { ClosedTradesTable } from '@/components/dashboard/ClosedTradesTable';
import { StatsStrip } from '@/components/dashboard/StatsStrip';
import { NavBar } from '@/components/layout/NavBar';
import { EvolutionChart } from '@/components/dashboard/charts/EvolutionChart';
import { PrivacyProvider } from '@/context/PrivacyContext';
import { KPICardsGrid } from '@/components/dashboard/KPICardsGrid';
import { Database } from 'lucide-react';

interface DashboardProps {
  positions: Position[];
  orders: RawOrder[];
  stats: PortfolioStats | null;
  arsToUsdRate: number;
  onReset: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 mb-3">
      {children}
    </h2>
  );
}

export function Dashboard({ positions, orders, stats, arsToUsdRate, onReset }: DashboardProps) {
  const [globalCurrency, setGlobalCurrency] = useState<'USD' | 'ARS'>('USD');

  const totalInvestedUSD = useMemo(
    () => positions.reduce((sum, pos) => sum + pos.investedValueUSD, 0),
    [positions]
  );

  const currentTotalValueUSD = useMemo(
    () => positions.reduce((sum, pos) => sum + (pos.currentValueUSD ?? pos.investedValueUSD), 0),
    [positions]
  );

  const currencyMultiplier = globalCurrency === 'USD' ? 1 : arsToUsdRate;

  const totalInvested = totalInvestedUSD * currencyMultiplier;
  const currentTotalValue = currentTotalValueUSD * currencyMultiplier;
  const totalPnlAbsolute = (currentTotalValueUSD - totalInvestedUSD) * currencyMultiplier;
  const totalPnlPercentage =
    totalInvestedUSD > 0 ? ((currentTotalValueUSD - totalInvestedUSD) / totalInvestedUSD) * 100 : 0;

  const navBar = (
    <NavBar
      arsToUsdRate={arsToUsdRate}
      onReset={onReset}
      currency={globalCurrency}
      onCurrencyChange={setGlobalCurrency}
    />
  );

  if (positions.length === 0) {
    return (
      <PrivacyProvider>
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
          {navBar}
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Database size={48} className="text-slate-300 stroke-[1.5] mb-5" />
            <p className="text-base text-slate-500 font-medium tracking-tight max-w-lg leading-relaxed">
              El reporte del broker seleccionado no registra operaciones válidas de compra o venta
              de activos
            </p>
          </div>
        </div>
      </PrivacyProvider>
    );
  }

  return (
    <PrivacyProvider>
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {navBar}

        <div className="space-y-4">
          <KPICardsGrid
            positions={positions}
            stats={stats}
            globalCurrency={globalCurrency}
            currencyMultiplier={currencyMultiplier}
            totalInvested={totalInvested}
            currentTotalValue={currentTotalValue}
            totalPnlAbsolute={totalPnlAbsolute}
            totalPnlPercentage={totalPnlPercentage}
          />
          {stats && (
            <StatsStrip
              stats={stats}
              arsToUsdRate={arsToUsdRate}
              currency={globalCurrency}
              openPositions={positions.length}
            />
          )}
        </div>

        <div>
          <SectionTitle>Evolución</SectionTitle>
          <EvolutionChart
            orders={orders}
            positions={positions}
            arsToUsdRate={arsToUsdRate}
            currency={globalCurrency}
          />
        </div>

        <div>
          <SectionTitle>Composición</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PortfolioDistribution
              positions={positions}
              arsToUsdRate={arsToUsdRate}
              currency={globalCurrency}
            />
            <AssetTypeDistribution
              positions={positions}
              arsToUsdRate={arsToUsdRate}
              currency={globalCurrency}
            />
          </div>
        </div>

        <div>
          <SectionTitle>Rendimiento y actividad</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <PnLByAssetChart
              positions={positions}
              arsToUsdRate={arsToUsdRate}
              currency={globalCurrency}
            />
            {stats && (
              <MonthlyActivityChart
                monthly={stats.monthly}
                arsToUsdRate={arsToUsdRate}
                currency={globalCurrency}
              />
            )}
          </div>
        </div>

        <div>
          <SectionTitle>Detalle</SectionTitle>
          <div className="space-y-5">
            <PositionsTable
              positions={positions}
              arsToUsdRate={arsToUsdRate}
              currency={globalCurrency}
            />
            {stats && (
              <ClosedTradesTable
                trades={stats.closedTrades}
                arsToUsdRate={arsToUsdRate}
                currency={globalCurrency}
              />
            )}
          </div>
        </div>
      </div>
    </PrivacyProvider>
  );
}
