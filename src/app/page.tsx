'use client';

import { useState } from 'react';
import { UploadView } from '@/components/upload/UploadView';
import { BrokerType } from '@/constants/brokers';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { parseBalanz, parseCocos } from '@/utils/parser';
import { calculatePositions, enrichPositions, lastTradedPrices } from '@/utils/calculator';
import { calculateStats } from '@/utils/stats';
import { PortfolioStats, Position, RawOrder } from '@/types';
import { fetchDolarRate, fetchCurrentPrices } from '@/utils/api';

export default function Home() {
  const [arsToUsdRate, setArsToUsdRate] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDashboard, setIsDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File, broker: BrokerType) => {
    try {
      setIsLoading(true);

      let parsePromise: Promise<RawOrder[]>;
      switch (broker) {
        case 'cocos':
          parsePromise = parseCocos(file);
          break;
        case 'balanz':
        default:
          parsePromise = parseBalanz(file);
          break;
      }

      const [parsedOrders, fetchedRate] = await Promise.all([parsePromise, fetchDolarRate()]);

      setArsToUsdRate(fetchedRate);
      const calculatedPositions = calculatePositions(parsedOrders, fetchedRate);

      const pricesMap = await fetchCurrentPrices(calculatedPositions.map((p) => p.ticker));

      const enrichedPositions = enrichPositions(
        calculatedPositions,
        pricesMap,
        lastTradedPrices(parsedOrders, fetchedRate),
        fetchedRate
      );

      setPositions(enrichedPositions);
      setStats(calculateStats(parsedOrders, fetchedRate));
      setOrders(parsedOrders);
      setIsDashboard(true);
    } catch (err) {
      console.error('Error al procesar el archivo o la API:', err);
      setError('Hubo un error al procesar el archivo o al obtener la cotización del Dólar MEP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setIsDashboard(false);
    setPositions([]);
    setOrders([]);
    setStats(null);
  };

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      {!isDashboard ? (
        <UploadView
          onFileSelect={handleFileSelect}
          isLoading={isLoading}
          error={error}
          onError={setError}
          onErrorClear={() => setError(null)}
        />
      ) : (
        <Dashboard
          positions={positions}
          orders={orders}
          stats={stats}
          arsToUsdRate={arsToUsdRate}
          onReset={handleReset}
        />
      )}
    </main>
  );
}
