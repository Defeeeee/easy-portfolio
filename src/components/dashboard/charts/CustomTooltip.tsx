import { usePrivacy } from '@/context/PrivacyContext';
import { formatCurrency } from '@/utils/format';

interface TooltipEntry {
  name?: string | number;
  value?: string | number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  totalValue: number;
  currency: 'USD' | 'ARS';
}

export function CustomTooltip({ active, payload, totalValue, currency }: CustomTooltipProps) {
  const { isPrivate } = usePrivacy();

  if (!active || !payload?.length) return null;

  const value = Number(payload[0].value ?? 0);
  const percent = totalValue > 0 ? ((value / totalValue) * 100).toFixed(2) : '0.00';

  return (
    <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-800 mb-1 dark:text-slate-200">
        {payload[0].name}
      </p>
      <p className="text-sm font-semibold text-slate-800 tabular-nums dark:text-slate-200">
        {isPrivate ? '***' : formatCurrency(value, currency)}
      </p>
      <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{percent}% de la cartera</p>
    </div>
  );
}
