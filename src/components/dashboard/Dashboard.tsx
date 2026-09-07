'use client';

import { useMemo, useState } from 'react';
import { Position } from '@/types';
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
import { AllocationSimulator } from '@/components/dashboard/AllocationSimulator';
import { RebalanceCard } from '@/components/dashboard/RebalanceCard';
import { AlertsCard } from '@/components/dashboard/AlertsCard';
import { PositionDetail } from '@/components/dashboard/PositionDetail';
import { NavBar } from '@/components/layout/NavBar';
import { EvolutionChart } from '@/components/dashboard/charts/EvolutionChart';
import { PrivacyProvider } from '@/context/PrivacyContext';
import { KPICardsGrid } from '@/components/dashboard/KPICardsGrid';
import { PortfolioModel } from '@/utils/portfolio';
import { buildTimeline } from '@/utils/timeline';
import { buildCpiIndex, accumulatedInflation } from '@/utils/inflation';
import { BENCHMARKS, DEFAULT_BENCHMARK, benchmarkByKey } from '@/constants/benchmarks';
import { startOfDay } from '@/utils/series';
import { parseOrderDate } from '@/utils/parser';
import { Database, Info } from 'lucide-react';

interface DashboardProps {
  model: PortfolioModel;
  onReset: () => void;
}

export const DASHBOARD_CAPTURE_ID = 'dashboard-capture';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-3">
      {children}
    </h2>
  );
}

export function Dashboard({ model, onReset }: DashboardProps) {
  const [globalCurrency, setGlobalCurrency] = useState<'USD' | 'ARS'>('USD');
  const [benchmarkKey, setBenchmarkKey] = useState(DEFAULT_BENCHMARK);
  const [selected, setSelected] = useState<Position | null>(null);

  const {
    orders,
    positions,
    stats,
    fx,
    history,
    benchmarks,
    inflation,
    arsToUsdRate,
    hasFxHistory,
    estimatedTickers,
    duplicatesSkipped,
    brokersDetected,
  } = model;

  // La línea de tiempo se recalcula al cambiar de benchmark: es barato y evita
  // volver a pedir las series al servidor.
  const timeline = useMemo(
    () =>
      buildTimeline({
        orders,
        positions,
        fx,
        history,
        benchmark: benchmarks.get(benchmarkKey),
      }),
    [orders, positions, fx, history, benchmarks, benchmarkKey]
  );

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

  // Inflación acumulada del período cubierto, para leer el rendimiento en pesos
  // reales: en Argentina un resultado nominal positivo puede ser una pérdida.
  const inflationPct = useMemo(() => {
    if (inflation.length === 0 || !stats.firstDate) return null;
    const cpi = buildCpiIndex(inflation);
    return accumulatedInflation(
      startOfDay(parseOrderDate(stats.firstDate)),
      startOfDay(new Date()),
      cpi
    );
  }, [inflation, stats.firstDate]);

  const navBar = (
    <NavBar
      arsToUsdRate={arsToUsdRate}
      onReset={onReset}
      currency={globalCurrency}
      onCurrencyChange={setGlobalCurrency}
      captureTargetId={DASHBOARD_CAPTURE_ID}
    />
  );

  if (positions.length === 0) {
    return (
      <PrivacyProvider>
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
          {navBar}
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Database size={48} className="text-slate-300 dark:text-slate-700 stroke-[1.5] mb-5" />
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
  if (brokersDetected.length > 1) {
    notices.push(`Cartera consolidada de ${brokersDetected.join(' y ')}.`);
  }
  if (!hasFxHistory) {
    notices.push(
      'No se pudo traer la serie histórica del MEP: la conversión a dólares usa la cotización de hoy para todo el período.'
    );
  }

  return (
    <PrivacyProvider>
      <div
        id={DASHBOARD_CAPTURE_ID}
        className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-10"
      >
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
            inflationPct={inflationPct}
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-4 mb-3">
            <SectionTitle>Evolución</SectionTitle>
            <label className="flex items-center gap-2 text-xs" data-exclude-from-capture="true">
              <span className="text-slate-400 dark:text-slate-500">Comparar contra</span>
              <select
                value={benchmarkKey}
                onChange={(e) => setBenchmarkKey(e.target.value)}
                className="font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-2 py-1 cursor-pointer"
              >
                {BENCHMARKS.filter((b) => benchmarks.has(b.key)).map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <EvolutionChart
            timeline={timeline}
            arsToUsdRate={arsToUsdRate}
            currency={globalCurrency}
            benchmarkLabel={benchmarkByKey(benchmarkKey).label}
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
            <AlertsCard positions={positions} />
          </div>
        </div>

        <div>
          <SectionTitle>Simulación y rebalanceo</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <AllocationSimulator
              positions={positions}
              history={history}
              benchmarks={benchmarks}
              fx={fx}
              arsToUsdRate={arsToUsdRate}
              currency={globalCurrency}
            />
            <RebalanceCard
              positions={positions}
              arsToUsdRate={arsToUsdRate}
              currency={globalCurrency}
            />
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
              onSelect={setSelected}
            />
            <ClosedTradesTable
              trades={stats.closedTrades}
              arsToUsdRate={arsToUsdRate}
              currency={globalCurrency}
            />
            <FiscalYearsCard stats={stats} arsToUsdRate={arsToUsdRate} currency={globalCurrency} />
          </div>
        </div>
      </div>

      {selected && (
        <PositionDetail
          position={selected}
          orders={orders}
          history={history}
          fx={fx}
          arsToUsdRate={arsToUsdRate}
          currency={globalCurrency}
          onClose={() => setSelected(null)}
        />
      )}
    </PrivacyProvider>
  );
}
