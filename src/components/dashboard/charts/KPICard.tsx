export interface KPICardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  valueColor?: string;
  badge?: string;
  badgeColor?: string;
}

export function KPICard({
  title,
  value,
  icon,
  className,
  valueColor,
  badge,
  badgeColor,
}: KPICardProps) {
  return (
    <div
      className={`bg-white px-6 py-5 rounded-md shadow-sm border border-slate-200 flex items-center gap-4 ${className}`}
    >
      {icon && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">{icon}</div>}
      <div className="w-full">
        <div className="flex justify-between gap-2">
          <p className="text-xs font-semibold tracking-widest text-slate-400">{title}</p>
          {badge && (
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-md ${badgeColor || 'bg-slate-100 text-slate-600'}`}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className={`text-2xl font-bold tracking-tight ${valueColor || 'text-slate-900'}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
