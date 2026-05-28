'use client';

import { useState } from 'react';
import { UploadView } from '@/components/upload/UploadView';
import { BrokerType } from '@/constants/brokers';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { parseBalanz, parseCocos } from '@/utils/parser';
import { calculatePositions } from '@/utils/calculator';
import { Position, RawOrder } from '@/types';
import { fetchDolarRate, fetchCurrentPrices } from '@/utils/api';

export default function Home() {
  const [arsToUsdRate, setArsToUsdRate] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<RawOrder[]>([]);
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
        case 'bullmarket':
          parsePromise = parseBullMarket(file);
          break;
        case 'balanz':
        default:
          parsePromise = parseBalanz(file);
          break;
      }

      const [orders, fetchedRate] = await Promise.all([parsePromise, fetchDolarRate()]);

      setArsToUsdRate(fetchedRate);
      const calculatedPositions = calculatePositions(orders, fetchedRate);

      const tickers = calculatedPositions.map((p) => p.ticker);
      const pricesMap = await fetchCurrentPrices(tickers);

      const enrichedPositions = calculatedPositions.map((pos) => {
        const quote = pricesMap[pos.ticker];
        if (!quote) return pos;

        const currentPriceUSD = quote.currency === 'ARS' ? quote.price / fetchedRate : quote.price;
        const currentValueUSD = pos.quantity * currentPriceUSD;
        const pnlAbsolute = currentValueUSD - pos.investedValueUSD;
        const pnlPercentage =
          pos.investedValueUSD > 0 ? (pnlAbsolute / pos.investedValueUSD) * 100 : 0;

        return {
          ...pos,
          currentPriceUSD,
          currentValueUSD,
          pnlAbsolute,
          pnlPercentage,
        };
      });

      setPositions(enrichedPositions);
      setOrders(orders);
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
          arsToUsdRate={arsToUsdRate}
          onReset={handleReset}
        />
      )}
    </main>
  );
}
