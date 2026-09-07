interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function Card({
  title,
  subtitle,
  action,
  footer,
  className = '',
  bodyClassName = '',
  children,
}: CardProps) {
  return (
    <section
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col ${className}`}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div>
            {title && (
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">{subtitle}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={`flex-1 px-6 pb-6 ${!title ? 'pt-6' : ''} ${bodyClassName}`}>{children}</div>
      {footer && (
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800">{footer}</div>
      )}
    </section>
  );
}
