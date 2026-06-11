import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { DollarSign, Banknote } from 'lucide-react';

interface CurrencyToggleProps {
  currency: 'USD' | 'ARS';
  onChange: (c: 'USD' | 'ARS') => void;
  disabled: boolean;
}

export function CurrencyToggle({ currency, onChange, disabled }: CurrencyToggleProps) {
  return (
    <ToggleGroup.Root
      type="single"
      value={currency}
      onValueChange={(value) => {
        if (value === 'USD' || value === 'ARS') onChange(value);
      }}
      disabled={disabled}
      className={`flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-50 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      aria-label="Seleccionar moneda"
    >
      <ToggleGroup.Item
        value="USD"
        className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all
          text-slate-400 hover:text-slate-600
          data-[state=on]:text-slate-900"
        aria-label="Dólares (USD)"
      >
        <DollarSign size={12} />
        USD
      </ToggleGroup.Item>

      <ToggleGroup.Item
        value="ARS"
        className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all
          text-slate-400 hover:text-slate-600
          data-[state=on]:text-slate-900"
        aria-label="Pesos argentinos (ARS)"
      >
        <Banknote size={12} />
        ARS
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  );
}
