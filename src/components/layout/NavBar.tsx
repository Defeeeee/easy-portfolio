import { ChevronLeft } from 'lucide-react';
import { CurrencyToggle } from '@/components/ui/CurrencyToggle';
import { PrivacyToggle } from '@/components/ui/PrivacyToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface NavBarProps {
  arsToUsdRate: number;
  onReset: () => void;
  currency: 'USD' | 'ARS';
  onCurrencyChange: (currency: 'USD' | 'ARS') => void;
}

export function NavBar({ arsToUsdRate, onReset, currency, onCurrencyChange }: NavBarProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
      <div className="flex items-center justify-between w-full md:block md:w-auto">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-slate-100">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
          {arsToUsdRate ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-mono font-medium dark:bg-slate-800 dark:text-slate-300">
              1 USD = ${arsToUsdRate.toLocaleString('es-AR')} ARS
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">· sólo activos en USD</span>
          )}
        </p>
      </div>
      <div className="flex justify-between md:justify-end w-full md:w-auto gap-2">
        <PrivacyToggle />

        <ThemeToggle />

        <CurrencyToggle currency={currency} onChange={onCurrencyChange} disabled={!arsToUsdRate} />

        <button
          onClick={onReset}
          className="cursor-pointer flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium text-sm dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
        >
          <ChevronLeft size={15} />
          Subir otro archivo
        </button>
      </div>
    </div>
  );
}
