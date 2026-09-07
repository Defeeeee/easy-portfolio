export interface KPICardProps {
  title: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
  valueColor?: string;
  badge?: string;
  badgeColor?: string;
  emphasis?: boolean;
}

export function KPICard({
  title,
  value,
  hint,
  icon,
  className = '',
  valueColor,
  badge,
  badgeColor,
  emphasis = false,
}: KPICardProps) {
  return (
    <div
      className={`bg-white px-5 py-4 rounded-xl border shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex items-center gap-4 ${
        emphasis ? 'border-slate-300' : 'border-slate-200/80'
      } ${className}`}
    >
      {icon && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">{icon}</div>}
      <div className="w-full min-w-0">
        <div className="flex justify-between items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 truncate">
            {title}
          </p>
          {badge && (
            <span
              className={`px-2 py-0.5 text-[11px] font-semibold rounded-md tabular-nums shrink-0 ${
                badgeColor || 'bg-slate-100 text-slate-600'
              }`}
            >
              {badge}
            </span>
          )}
        </div>
        <p
          className={`mt-1 font-bold tracking-tight tabular-nums truncate ${
            emphasis ? 'text-[26px] leading-8' : 'text-[22px] leading-7'
          } ${valueColor || 'text-slate-900'}`}
        >
          {value}
        </p>
        {hint && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  );
}
