import { DollarSign, Banknote } from 'lucide-react';

interface CurrencyToggleProps {
  currency: 'USD' | 'ARS';
  onChange: (c: 'USD' | 'ARS') => void;
  disabled: boolean;
}

export function CurrencyToggle({ currency, onChange, disabled }: CurrencyToggleProps) {
  return (
    <div
      className={`flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <button
        onClick={() => onChange('USD')}
        className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${
          currency === 'USD'
            ? 'text-slate-900 dark:text-slate-100'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
        }`}
      >
        <DollarSign size={12} />
        USD
      </button>
      <button
        onClick={() => onChange('ARS')}
        className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${
          currency === 'ARS'
            ? 'text-slate-900 dark:text-slate-100'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
        }`}
      >
        <Banknote size={12} />
        ARS
      </button>
    </div>
  );
}
