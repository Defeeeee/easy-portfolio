import * as Tooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';

export interface KPICardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  valueColor?: string;
  badge?: string;
  badgeColor?: string;
  tooltip?: string;
}

export function KPICard({
  title,
  value,
  icon,
  className,
  valueColor,
  badge,
  badgeColor,
  tooltip,
}: KPICardProps) {
  return (
    <Tooltip.Provider delayDuration={300}>
      <div
        className={`bg-white px-6 py-5 rounded-md shadow-sm border border-slate-200 flex items-center gap-4 ${className}`}
      >
        {icon && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">{icon}</div>}
        <div className="w-full">
          <div className="flex justify-between gap-2">
            {/* Title — with optional tooltip */}
            {tooltip ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button className="flex items-center gap-1 text-xs font-semibold tracking-widest text-slate-400 hover:text-slate-500 transition-colors cursor-help">
                    {title}
                    <Info size={11} className="shrink-0" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="top"
                    sideOffset={6}
                    className="z-50 max-w-xs rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white shadow-lg
                      data-[state=delayed-open]:animate-in data-[state=closed]:animate-out
                      data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0
                      data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95
                      data-[side=top]:slide-in-from-bottom-2"
                  >
                    {tooltip}
                    <Tooltip.Arrow className="fill-slate-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : (
              <p className="text-xs font-semibold tracking-widest text-slate-400">{title}</p>
            )}

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
    </Tooltip.Provider>
  );
}
