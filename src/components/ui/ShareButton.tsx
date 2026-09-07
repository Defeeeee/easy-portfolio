'use client';

import { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';

interface ShareButtonProps {
  /** Id del elemento a capturar. */
  targetId: string;
}

/** Descarga una imagen del dashboard, respetando el modo privacidad activo. */
export function ShareButton({ targetId }: ShareButtonProps) {
  const [busy, setBusy] = useState(false);

  const capture = async () => {
    const node = document.getElementById(targetId);
    if (!node) return;

    setBusy(true);
    try {
      const { toPng } = await import('html-to-image');
      const isDark = document.documentElement.classList.contains('dark');
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: isDark ? '#0b1120' : '#f8fafc',
        filter: (el) => !(el instanceof HTMLElement && el.dataset.excludeFromCapture === 'true'),
      });

      const link = document.createElement('a');
      link.download = `portfolio-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('No se pudo generar la imagen:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={capture}
      disabled={busy}
      data-exclude-from-capture="true"
      aria-label="Descargar imagen del dashboard"
      title="Descargar imagen del dashboard"
      className="cursor-pointer p-2.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
    </button>
  );
}
