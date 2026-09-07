'use client';

import { useEffect, useMemo, useState } from 'react';
import { Position } from '@/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Info } from 'lucide-react';

import { usePrivacy } from '@/context/PrivacyContext';
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatPrice,
  formatQuantity,
} from '@/utils/format';

interface PositionsTableProps {
  positions: Position[];
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
}

interface RowProps {
  pos: Position;
  currency: 'USD' | 'ARS';
  multiplier: number;
  weight: number;
}

function ValueCell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`col-span-2 flex justify-between items-center py-2 border-t border-slate-50 md:border-t-0 md:table-cell md:px-5 md:py-4 md:text-right font-mono text-sm tabular-nums ${className}`}
    >
      {children}
    </td>
  );
}

function SortableRow({ pos, currency, multiplier, weight }: RowProps) {
  const { isPrivate } = usePrivacy();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pos.ticker,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: isDragging ? ('relative' as const) : undefined,
  };

  const hide = (node: React.ReactNode) => (isPrivate ? '***' : node);
  const pnl = pos.pnlAbsolute;
  const estimated = pos.priceSource === 'last-trade';

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-2 gap-y-1 p-4 border-b border-slate-200 md:table-row md:border-0 md:p-0 hover:bg-slate-50/70 transition-colors ${
        isDragging ? 'bg-white shadow-lg ring-2 ring-indigo-500/20' : ''
      }`}
    >
      <td className="col-span-1 order-2 flex justify-end items-center md:table-cell md:px-2 md:py-4 md:w-8">
        <button
          {...attributes}
          {...listeners}
          aria-label={`Reordenar ${pos.ticker}`}
          className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical size={15} />
        </button>
      </td>

      <td className="col-span-1 order-1 flex flex-col justify-center md:table-cell md:px-5 md:py-4 md:text-left">
        <span className="font-bold text-base text-slate-800 tracking-tight md:text-sm md:font-semibold">
          {pos.ticker}
        </span>
        <span className="text-[11px] text-slate-400 md:block">{pos.assetType}</span>
      </td>

      <ValueCell className="order-3 text-slate-600">
        <span className="md:hidden text-xs font-semibold uppercase tracking-wider text-slate-400">
          Cantidad
        </span>
        <span>{hide(formatQuantity(pos.quantity))}</span>
      </ValueCell>

      <td className="hidden md:table-cell md:px-5 md:py-4 md:text-right font-mono text-sm text-slate-600 tabular-nums">
        {pos.currentPriceUSD !== undefined ? (
          <span className={estimated ? 'text-slate-400' : ''}>
            {hide(formatPrice(pos.currentPriceUSD * multiplier, currency))}
            {estimated && <span className="text-amber-500 ml-0.5">*</span>}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      <td className="hidden md:table-cell md:px-5 md:py-4 md:text-right font-mono text-sm text-slate-500 tabular-nums">
        {hide(formatCurrency(pos.investedValueUSD * multiplier, currency))}
      </td>

      <ValueCell className="order-4 font-semibold text-slate-800">
        <span className="md:hidden text-xs font-semibold uppercase tracking-wider text-slate-400">
          Valor Actual
        </span>
        <span>
          {pos.currentValueUSD !== undefined ? (
            hide(formatCurrency(pos.currentValueUSD * multiplier, currency))
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </span>
      </ValueCell>

      <ValueCell className="order-5">
        <span className="md:hidden text-xs font-semibold uppercase tracking-wider text-slate-400">
          P&L
        </span>
        <span className="flex items-center gap-2 md:justify-end">
          {pnl !== undefined ? (
            <>
              <span className={`font-semibold ${pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {hide(formatCurrency(pnl * multiplier, currency, { showSign: true }))}
              </span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                  pnl >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {formatPercent(pos.pnlPercentage ?? 0)}
              </span>
            </>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </span>
      </ValueCell>

      <ValueCell className="order-6 text-slate-500">
        <span className="md:hidden text-xs font-semibold uppercase tracking-wider text-slate-400">
          % Cartera
        </span>
        <span className="flex items-center gap-2 md:justify-end">
          <span className="hidden md:block w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <span
              className="block h-full bg-slate-300 rounded-full"
              style={{ width: `${Math.min(100, weight)}%` }}
            />
          </span>
          {weight.toFixed(1)}%
        </span>
      </ValueCell>
    </tr>
  );
}

export function PositionsTable({ positions, arsToUsdRate, currency }: PositionsTableProps) {
  const [localPositions, setLocalPositions] = useState<Position[]>([]);

  useEffect(() => {
    setLocalPositions(positions);
  }, [positions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalPositions((items) => {
        const oldIndex = items.findIndex((i) => i.ticker === active.id);
        const newIndex = items.findIndex((i) => i.ticker === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const multiplier = currency === 'USD' ? 1 : arsToUsdRate;

  const totalValueUSD = useMemo(
    () => localPositions.reduce((sum, p) => sum + (p.currentValueUSD ?? p.investedValueUSD), 0),
    [localPositions]
  );

  const estimatedPositions = useMemo(
    () => localPositions.filter((p) => p.priceSource === 'last-trade'),
    [localPositions]
  );

  if (localPositions.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <header className="px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Resumen de posiciones
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Arrastrá las filas para ordenarlas a tu gusto
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-400 shrink-0">
          {localPositions.length} abiertas
        </span>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="md:overflow-x-auto">
          <table className="w-full border-collapse block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-slate-50/70 text-slate-400 text-[10px] uppercase tracking-[0.12em]">
                <th className="px-2 py-2.5 w-8 border-y border-slate-100"></th>
                <th className="px-5 py-2.5 font-semibold border-y border-slate-100 text-left">
                  Ticker
                </th>
                <th className="px-5 py-2.5 font-semibold border-y border-slate-100 text-right">
                  Cantidad
                </th>
                <th className="px-5 py-2.5 font-semibold border-y border-slate-100 text-right">
                  Precio Actual
                </th>
                <th className="px-5 py-2.5 font-semibold border-y border-slate-100 text-right">
                  Costo Total
                </th>
                <th className="px-5 py-2.5 font-semibold border-y border-slate-100 text-right">
                  Valor Actual
                </th>
                <th className="px-5 py-2.5 font-semibold border-y border-slate-100 text-right">
                  P&L
                </th>
                <th className="px-5 py-2.5 font-semibold border-y border-slate-100 text-right">
                  % Cartera
                </th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group p-4 md:p-0 bg-slate-50/30 md:bg-transparent divide-y-0 md:divide-y md:divide-slate-50">
              <SortableContext
                items={localPositions.map((p) => p.ticker)}
                strategy={verticalListSortingStrategy}
              >
                {localPositions.map((pos) => (
                  <SortableRow
                    key={pos.ticker}
                    pos={pos}
                    currency={currency}
                    multiplier={multiplier}
                    weight={
                      totalValueUSD > 0
                        ? ((pos.currentValueUSD ?? pos.investedValueUSD) / totalValueUSD) * 100
                        : 0
                    }
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </div>
      </DndContext>

      {estimatedPositions.length > 0 && (
        <footer className="px-6 py-3 border-t border-slate-100 flex items-start gap-2">
          <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="text-amber-500 font-semibold">*</span> Sin cotización de mercado; se
            valúa con el último precio operado en el archivo:{' '}
            {estimatedPositions
              .map((p) => `${p.ticker}${p.priceDate ? ` (${formatDate(p.priceDate)})` : ''}`)
              .join(', ')}
            .
          </p>
        </footer>
      )}
    </section>
  );
}
