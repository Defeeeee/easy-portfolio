'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadView } from '@/components/upload/UploadView';
import { BrokerType } from '@/constants/brokers';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { PortfolioModel, buildPortfolio, parseFiles } from '@/utils/portfolio';
import { clearSession, loadSession, saveSession } from '@/utils/storage';

export default function Home() {
  const [model, setModel] = useState<PortfolioModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const restored = useRef(false);

  // Rearma el último dashboard sin pedir el archivo de nuevo.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const session = loadSession();
    if (!session) {
      setIsRestoring(false);
      return;
    }

    buildPortfolio(session.orders, session.cash)
      .then(setModel)
      .catch((err) => {
        console.error('No se pudo restaurar la sesión guardada:', err);
        clearSession();
      })
      .finally(() => setIsRestoring(false));
  }, []);

  const handleFileSelect = useCallback(async (files: File[], broker: BrokerType) => {
    try {
      setIsLoading(true);

      const { orders, cash, duplicates, brokers } = await parseFiles(files, broker);
      const built = await buildPortfolio(orders, cash, duplicates, brokers);

      saveSession({ broker, orders, cash, fileNames: files.map((f) => f.name) });
      setModel(built);
    } catch (err) {
      console.error('Error al procesar el archivo o la API:', err);
      setError(
        err instanceof Error && err.message.includes('Bull Market')
          ? err.message
          : 'Hubo un error al procesar el archivo o al obtener la cotización del Dólar MEP.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    clearSession();
    setModel(null);
  }, []);

  return (
    <main className="min-h-screen bg-[var(--surface-page)]">
      {!model ? (
        <UploadView
          onFileSelect={handleFileSelect}
          isLoading={isLoading || isRestoring}
          error={error}
          onError={setError}
          onErrorClear={() => setError(null)}
        />
      ) : (
        <Dashboard model={model} onReset={handleReset} />
      )}
    </main>
  );
}
