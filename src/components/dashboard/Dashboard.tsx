'use client';

import { useMemo, useState } from 'react';
import { Position, RawOrder } from '@/types';
import { PortfolioDistribution } from '@/components/dashboard/charts/PortfolioDistribution';
import { AssetTypeDistribution } from '@/components/dashboard/charts/AssetTypeDistribution';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { NavBar } from '@/components/layout/NavBar';
import { EvolutionChart } from '@/components/dashboard/charts/EvolutionChart';
import { PrivacyProvider } from '@/context/PrivacyContext';
import { KPICardsGrid } from '@/components/dashboard/KPICardsGrid';
import { Database } from 'lucide-react';

interface DashboardProps {
  positions: Position[];
  orders: RawOrder[];
  arsToUsdRate: number;
  onReset: () => void;
}

export function Dashboard({ positions, orders, arsToUsdRate, onReset }: DashboardProps) {
  const [globalCurrency, setGlobalCurrency] = useState<'USD' | 'ARS'>('USD');

  const totalInvestedUSD = useMemo(() => {
    return positions.reduce((sum, pos) => sum + pos.investedValueUSD, 0);
  }, [positions]);

  const currentTotalValueUSD = useMemo(() => {
    return positions.reduce((sum, pos) => sum + (pos.currentValueUSD || pos.investedValueUSD), 0);
  }, [positions]);

  const currencyMultiplier = globalCurrency === 'USD' ? 1 : arsToUsdRate;

  const totalInvested = totalInvestedUSD * currencyMultiplier;
  const currentTotalValue = currentTotalValueUSD * currencyMultiplier;
  const totalPnlAbsolute = (currentTotalValueUSD - totalInvestedUSD) * currencyMultiplier;
  const totalPnlPercentage =
    totalInvestedUSD > 0 ? ((currentTotalValueUSD - totalInvestedUSD) / totalInvestedUSD) * 100 : 0;

  if (positions.length === 0) {
    return (
      <PrivacyProvider>
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
          <NavBar
            arsToUsdRate={arsToUsdRate}
            onReset={onReset}
            currency={globalCurrency}
            onCurrencyChange={setGlobalCurrency}
            showControls={false}
          />

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
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Header */}
        <NavBar
          arsToUsdRate={arsToUsdRate}
          onReset={onReset}
          currency={globalCurrency}
          onCurrencyChange={setGlobalCurrency}
        />

        {/* KPI Cards */}
        <KPICardsGrid
          positions={positions}
          globalCurrency={globalCurrency}
          totalInvested={totalInvested}
          currentTotalValue={currentTotalValue}
          totalPnlAbsolute={totalPnlAbsolute}
          totalPnlPercentage={totalPnlPercentage}
        />

        {/* Charts */}
        <EvolutionChart
          orders={orders}
          positions={positions}
          arsToUsdRate={arsToUsdRate}
          currency={globalCurrency}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Table */}
        <PositionsTable
          positions={positions}
          arsToUsdRate={arsToUsdRate}
          currency={globalCurrency}
        />
      </div>
    </PrivacyProvider>
  );
}
