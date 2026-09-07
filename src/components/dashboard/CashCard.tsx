'use client';

import { PortfolioStats } from '@/types';
import { Card } from '@/components/ui/Card';
import { usePrivacy } from '@/context/PrivacyContext';
import { formatCurrency } from '@/utils/format';

interface CashCardProps {
  stats: PortfolioStats;
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
  investedUSD: number;
}

export function CashCard({ stats, arsToUsdRate, currency, investedUSD }: CashCardProps) {
  const { isPrivate } = usePrivacy();
  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;
  const { cash } = stats;

  const hide = (value: number, opts?: { showSign?: boolean }) =>
    isPrivate ? '***' : formatCurrency(value * multiplier, currency, opts);

  const totalCash = cash.totalUSD;
  const totalAccount = totalCash + investedUSD;
  const idleShare = totalAccount > 0 ? (totalCash / totalAccount) * 100 : 0;

  const rows: { label: string; value: string; muted?: boolean }[] = [
    { label: 'Pesos', value: isPrivate ? '***' : formatCurrency(cash.ars, 'ARS') },
    { label: 'Dólares', value: isPrivate ? '***' : formatCurrency(cash.usd, 'USD') },
    { label: 'Aportes acumulados', value: hide(cash.depositsUSD), muted: true },
    { label: 'Retiros acumulados', value: hide(cash.withdrawalsUSD), muted: true },
  ];

  if (Math.abs(cash.dividendsUSD) > 0.005) {
    rows.push({ label: 'Dividendos cobrados', value: hide(cash.dividendsUSD), muted: true });
  }

  return (
    <Card title="Efectivo en la cuenta" subtitle="Aportes y retiros menos lo aplicado a compras">
      <p className="text-[26px] leading-8 font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
        {hide(totalCash)}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        {idleShare.toFixed(1)}% de la cuenta sin invertir
      </p>

      <dl className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 text-xs">
            <dt
              className={
                row.muted
                  ? 'text-slate-400 dark:text-slate-500'
                  : 'text-slate-600 dark:text-slate-300'
              }
            >
              {row.label}
            </dt>
            <dd className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
