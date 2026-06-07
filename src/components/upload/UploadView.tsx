'use client';

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { Typewriter } from '@/components/ui/animations/TypeWriter';
import { BROKERS, type BrokerType } from '@/constants/brokers';
import { BrokerSelection } from '@/components/upload/BrokerSelection';

interface UploadViewProps {
  onFileSelect: (file: File, broker: BrokerType) => void;
  isLoading: boolean;
  error?: string | null;
  onError: (msg: string) => void;
  onErrorClear?: () => void;
}

export function UploadView({
  onFileSelect,
  isLoading,
  error,
  onError,
  onErrorClear,
}: UploadViewProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<BrokerType>('balanz');
  const [countdown, setCountdown] = useState(4);

  const typewriterWords = useMemo(() => [BROKERS[selectedBroker].name], [selectedBroker]);

  useEffect(() => {
    if (!error) return;

    setCountdown(5);

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [error]);

  useEffect(() => {
    if (error && countdown <= 0) {
      if (onErrorClear) onErrorClear();
    }
  }, [countdown, error, onErrorClear]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
          onFileSelect(file, selectedBroker);
        } else {
          onError('Por favor sube un archivo .xlsx o .csv válido.');
        }
      }
    },
    [onFileSelect, onError, selectedBroker]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        onFileSelect(file, selectedBroker);
      } else {
        onError('Por favor sube un archivo .xlsx o .csv válido.');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 relative">
      {/* GitHub Repo Link - Top Right */}
      <div className="absolute top-6 right-6 md:top-8 md:right-8">
        <a
          href="https://github.com/Tomas-Wardoloff/balanz-report"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-300 hover:text-slate-600 transition-colors duration-200"
          title="Ver repositorio en GitHub"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </a>
      </div>

      <div className="w-full max-w-xl my-auto flex flex-col items-center">
        {/* Header Wordmark */}
        <div className="text-center mb-8 w-full">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Tus inversiones de{' '}
            <Typewriter
              words={typewriterWords}
              speed={60}
              pauseDuration={2200}
              className={`text-4xl font-bold tracking-tight transition-colors duration-300 ${BROKERS[selectedBroker].textColorClass}`}
              style={{ fontFamily: BROKERS[selectedBroker].fontFamily }}
              renderText={BROKERS[selectedBroker].renderText}
            />
          </h1>
          <p className="text-md text-slate-500 mt-2">De una manera más simple</p>
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col gap-7">
          {error ? (
            <div className="flex flex-col items-center justify-center w-full py-10 px-6 border-2 border-red-200 bg-slate-50 rounded-xl text-center">
              <div className="p-3 text-red-600 rounded-xl mb-4">
                <AlertCircle size={32} />
              </div>
              <p className="text-sm font-semibold text-red-700 mb-2">{error}</p>
              <p className="text-xs text-red-500 font-medium">
                Podrás volver a intentarlo en {countdown} segundos...
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center w-full py-12 px-6 border-2 border-slate-100 bg-slate-50 rounded-xl text-center">
              <Loader2 size={40} className="animate-spin text-slate-600 mb-4" />
              <p className="text-sm font-semibold text-slate-700">
                Calculando cotizaciones y armando tu portfolio...
              </p>
            </div>
          ) : (
            <div
              className={`relative flex flex-col items-center justify-center w-full py-10 px-6 border-2 border-dashed rounded-xl transition-all duration-200 ${
                dragActive
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50 cursor-pointer'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                id="portfolio-upload"
                type="file"
                accept=".xlsx,.csv"
                onChange={handleChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Subir archivo de historial de operaciones (.xlsx o .csv)"
              />

              <div className="flex flex-col items-center gap-3 text-center">
                <div className={`p-3 rounded-xl transition-colors text-slate-500`}>
                  <Upload size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Arrastrá o hacé clic para subir tu historial de operaciones
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Los archivos pueden ser .xlsx o .csv dependiendo del broker
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-500 font-normal max-w-md">
          Esta aplicación es una herramienta independiente de visualización de datos y no se
          encuentra afiliada, asociada, respaldada ni vinculada formalmente con Balanz Capital S.A.
          o Cocos Capital S.A. ni con ninguna de sus entidades. Los nombres y marcas comerciales
          mencionadas pertenecen a sus respectivos titulares.
        </p>
      </div>

      {/* Footer Broker Selection */}
      <BrokerSelection selectedBroker={selectedBroker} onSelectBroker={setSelectedBroker} />
    </div>
  );
}
