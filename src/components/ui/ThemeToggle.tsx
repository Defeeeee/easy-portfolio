'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
      className="cursor-pointer p-2.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors dark:text-slate-500 dark:hover:bg-slate-800/60 dark:hover:text-slate-300"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
