'use client';

import { useMemo, useState } from 'react';
import { PortfolioDistribution } from '@/components/dashboard/charts/PortfolioDistribution';
import { AssetTypeDistribution } from '@/components/dashboard/charts/AssetTypeDistribution';
import { PnLByAssetChart } from '@/components/dashboard/charts/PnLByAssetChart';
import { MonthlyActivityChart } from '@/components/dashboard/charts/MonthlyActivityChart';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { ClosedTradesTable } from '@/components/dashboard/ClosedTradesTable';
import { StatsStrip } from '@/components/dashboard/StatsStrip';
import { CashCard } from '@/components/dashboard/CashCard';
import { RiskCard } from '@/components/dashboard/RiskCard';
import { FiscalYearsCard } from '@/components/dashboard/FiscalYearsCard';
import { NavBar } from '@/components/layout/NavBar';
import { EvolutionChart } from '@/components/dashboard/charts/EvolutionChart';
import { PrivacyProvider } from '@/context/PrivacyContext';
import { KPICardsGrid } from '@/components/dashboard/KPICardsGrid';
import { BENCHMARK_LABEL, PortfolioModel } from '@/utils/portfolio';
import { Database, Info } from 'lucide-react';

interface DashboardProps {
  model: PortfolioModel;
  onReset: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-3">
      {children}
    </h2>
  );
}

export function Dashboard({ model, onReset }: DashboardProps) {
  const [globalCurrency, setGlobalCurrency] = useState<'USD' | 'ARS'>('USD');
  const {
    positions,
    stats,
    timeline,
    arsToUsdRate,
    hasFxHistory,
    estimatedTickers,
    duplicatesSkipped,
  } = model;

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
            <Database
              size={48}
              className="text-slate-300 dark:text-slate-700 stroke-[1.5] mb-5 dark:text-slate-600"
            />
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium tracking-tight max-w-lg leading-relaxed">
              El reporte del broker seleccionado no registra operaciones válidas de compra o venta
              de activos
            </p>
          </div>
        </div>
      </PrivacyProvider>
    );
  }

  const notices: string[] = [];
  if (duplicatesSkipped > 0) {
    notices.push(
      `${duplicatesSkipped} ${duplicatesSkipped === 1 ? 'movimiento repetido' : 'movimientos repetidos'} entre archivos se descartaron.`
    );
  }
  if (!hasFxHistory) {
    notices.push(
      'No se pudo traer la serie histórica del MEP: la conversión a dólares usa la cotización de hoy para todo el período.'
    );
  }

  return (
    <PrivacyProvider>
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {navBar}

        {notices.length > 0 && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
            <Info size={15} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-200 space-y-0.5">
              {notices.map((notice) => (
                <p key={notice}>{notice}</p>
              ))}
            </div>
          </div>
        )}

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
          <StatsStrip
            stats={stats}
            arsToUsdRate={arsToUsdRate}
            currency={globalCurrency}
            openPositions={positions.length}
          />
        </div>

        <div>
          <SectionTitle>Evolución</SectionTitle>
          <EvolutionChart
            timeline={timeline}
            arsToUsdRate={arsToUsdRate}
            currency={globalCurrency}
            benchmarkLabel={BENCHMARK_LABEL}
            estimatedTickers={estimatedTickers}
          />
        </div>

        <div>
          <SectionTitle>Cuenta y riesgo</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <CashCard
              stats={stats}
              arsToUsdRate={arsToUsdRate}
              currency={globalCurrency}
              investedUSD={currentTotalValueUSD}
            />
            <RiskCard positions={positions} timeline={timeline} xirr={stats.xirr} />
            <FiscalYearsCard stats={stats} arsToUsdRate={arsToUsdRate} currency={globalCurrency} />
          </div>
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
            <MonthlyActivityChart
              monthly={stats.monthly}
              arsToUsdRate={arsToUsdRate}
              currency={globalCurrency}
            />
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
            <ClosedTradesTable
              trades={stats.closedTrades}
              arsToUsdRate={arsToUsdRate}
              currency={globalCurrency}
            />
          </div>
        </div>
      </div>
    </PrivacyProvider>
  );
}
