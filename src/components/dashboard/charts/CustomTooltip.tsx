import { usePrivacy } from '@/context/PrivacyContext';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  totalValue: number;
}

export function CustomTooltip({ active, payload, totalValue }: CustomTooltipProps) {
  const { isPrivate } = usePrivacy();

  if (active && payload && payload.length) {
    const value = payload[0].value;
    const percent = totalValue > 0 ? ((value / totalValue) * 100).toFixed(2) : '0.00';

    const formattedValue = isPrivate
      ? '***'
      : `$ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
      <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-slate-100">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-800 mb-1">
          {payload[0].name}
        </p>
        <p className="text-sm font-semibold text-slate-800">{formattedValue}</p>
        <p className="text-xs text-slate-500 mt-0.5">{percent}% de la cartera</p>
      </div>
    );
  }
  return null;
}
