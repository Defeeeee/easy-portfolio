'use client';

import { Download } from 'lucide-react';

interface ExportButtonProps {
  onExport: () => void;
  label?: string;
}

export function ExportButton({ onExport, label = 'CSV' }: ExportButtonProps) {
  return (
    <button
      onClick={onExport}
      className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors dark:hover:bg-slate-800/60"
      title="Descargar como CSV"
    >
      <Download size={13} />
      {label}
    </button>
  );
}
