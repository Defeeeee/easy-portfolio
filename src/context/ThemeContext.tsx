'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', toggle: () => {} });

const KEY = 'easy-portfolio:theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const hydrated = useRef(false);

  // El tema elegido sólo se conoce en el cliente, después de hidratar.
  useEffect(() => {
    let initial: Theme = 'light';
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored === 'dark' || stored === 'light') initial = stored;
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) initial = 'dark';
    } catch {
      // sin storage: queda el tema claro
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de la preferencia guardada
    setTheme(initial);
  }, []);

  // Un solo lugar aplica el efecto: la clase en <html> y la preferencia guardada.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(KEY, theme);
    } catch {
      // preferencia efímera, no es grave
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
