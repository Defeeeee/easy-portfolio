'use client';

import { useEffect, useMemo, useState } from 'react';
import { Position } from '@/types';
import { Card } from '@/components/ui/Card';
import { AlertTriangle, BellOff, Check } from 'lucide-react';
import { formatPercent } from '@/utils/format';

interface AlertsCardProps {
  positions: Position[];
}

interface Thresholds {
  maxWeight: number;
  gainTarget: number;
  lossLimit: number;
}

const KEY = 'easy-portfolio:alerts';
const DEFAULTS: Thresholds = { maxWeight: 40, gainTarget: 20, lossLimit: -10 };

interface Triggered {
  ticker: string;
  message: string;
  severity: 'warn' | 'good';
}

export function AlertsCard({ positions }: AlertsCardProps) {
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- la config guardada sólo existe en el cliente
      if (raw) setThresholds({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // sin storage: quedan los valores por defecto
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(thresholds));
    } catch {
      // preferencia efímera
    }
  }, [thresholds, loaded]);

  const triggered = useMemo<Triggered[]>(() => {
    const total = positions.reduce((s, p) => s + (p.currentValueUSD ?? p.investedValueUSD), 0);
    if (total <= 0) return [];

    const out: Triggered[] = [];
    for (const p of positions) {
      const weight = ((p.currentValueUSD ?? p.investedValueUSD) / total) * 100;
      if (weight > thresholds.maxWeight) {
        out.push({
          ticker: p.ticker,
          message: `pesa ${weight.toFixed(1)}% de la cartera, por encima del ${thresholds.maxWeight}% que fijaste`,
          severity: 'warn',
        });
      }
      const pnl = p.pnlPercentage;
      if (pnl === undefined) continue;
      if (pnl >= thresholds.gainTarget) {
        out.push({
          ticker: p.ticker,
          message: `alcanzó ${formatPercent(pnl)}, tu objetivo de ganancia`,
          severity: 'good',
        });
      } else if (pnl <= thresholds.lossLimit) {
        out.push({
          ticker: p.ticker,
          message: `cae ${formatPercent(pnl)}, por debajo de tu límite`,
          severity: 'warn',
        });
      }
    }
    return out;
  }, [positions, thresholds]);

  const field = (label: string, key: keyof Thresholds, min: number, max: number) => (
    <label className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          value={thresholds[key]}
          onChange={(e) => setThresholds((t) => ({ ...t, [key]: Number(e.target.value) }))}
          className="w-16 text-right font-mono tabular-nums text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2 py-1"
        />
        <span className="text-slate-400 dark:text-slate-500">%</span>
      </span>
    </label>
  );

  return (
    <Card title="Alertas" subtitle="Umbrales propios, guardados en este navegador">
      <div className="space-y-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        {field('Peso máximo por posición', 'maxWeight', 1, 100)}
        {field('Objetivo de ganancia', 'gainTarget', 0, 500)}
        {field('Límite de pérdida', 'lossLimit', -100, 0)}
      </div>

      {triggered.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-2">
          <BellOff size={14} />
          Ninguna posición cruzó los umbrales.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {triggered.map((alert, i) => (
            <li key={`${alert.ticker}-${i}`} className="flex items-start gap-2 text-xs">
              {alert.severity === 'warn' ? (
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              ) : (
                <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              )}
              <span className="text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {alert.ticker}
                </span>{' '}
                {alert.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
