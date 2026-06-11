'use client';

import { useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { AnimatedCurrency } from '@/components/ui/AnimatedCurrency';
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

import { usePrivacy } from '@/context/PrivacyContext';

interface PositionsTableProps {
  positions: Position[];
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
}

function SortableRow({
  pos,
  currency,
  arsToUsdRate,
  isLast,
}: {
  pos: Position;
  currency: 'USD' | 'ARS';
  arsToUsdRate: number;
  isLast: boolean;
}) {
  const { isPrivate } = usePrivacy();
  const targetMultiplier = currency === 'USD' ? 1 : arsToUsdRate;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pos.ticker,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: isDragging ? ('relative' as const) : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`
        grid grid-cols-2 gap-y-2 p-4 border-b border-slate-300 
        md:table-row md:bg-transparent md:border-0 md:p-0
        hover:bg-slate-50/70 transition-colors
        ${!isLast ? 'md:border-b md:border-slate-100' : ''}
        ${isDragging ? 'bg-white shadow-lg ring-2 ring-indigo-500/20 z-10 relative' : ''}
      `}
    >
      <td className="col-span-1 order-2 flex justify-end items-center md:table-cell md:order-none md:px-3 md:py-4 md:w-10">
        <button
          {...attributes}
          {...listeners}
          className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical size={16} />
        </button>
      </td>
      <td className="col-span-1 order-1 flex items-center font-bold text-base text-slate-800 tracking-tight md:table-cell md:order-none md:px-6 md:py-4 md:text-center md:font-semibold md:text-sm">
        {pos.ticker}
      </td>
      <td className="col-span-2 order-3 flex justify-between items-center py-2 border-t border-slate-100 pt-3 mt-1 md:mt-0 md:pt-0 md:border-t-0 md:table-cell md:order-none md:px-6 md:py-4 md:text-center font-mono text-sm text-slate-600">
        <span className="md:hidden text-xs font-semibold uppercase tracking-wider text-slate-400">
          Cant. Nominales
        </span>
        <span>{isPrivate ? '***' : pos.quantity.toLocaleString('es-AR')}</span>
      </td>
      <td className="hidden md:table-cell md:px-6 md:py-4 md:text-center font-mono text-sm text-slate-600">
        {pos.currentPriceUSD ? (
          <AnimatedCurrency value={pos.currentPriceUSD * targetMultiplier} currency={currency} />
        ) : (
          '-'
        )}
      </td>
      <td className="hidden md:table-cell md:px-6 md:py-4 md:text-center font-mono text-sm font-semibold text-slate-800">
        <AnimatedCurrency value={pos.investedValueUSD * targetMultiplier} currency={currency} />
      </td>
      <td className="col-span-2 order-4 flex justify-between items-center py-2 border-t border-slate-50 md:border-t-0 md:table-cell md:order-none md:px-6 md:py-4 md:text-center font-mono text-sm font-semibold text-slate-800">
        <span className="md:hidden text-xs font-semibold uppercase tracking-wider text-slate-400">
          Valor Actual
        </span>
        <span>
          {pos.currentValueUSD !== undefined ? (
            <AnimatedCurrency value={pos.currentValueUSD * targetMultiplier} currency={currency} />
          ) : (
            '-'
          )}
        </span>
      </td>
      <td
        className={`col-span-2 order-5 flex justify-between items-center py-2 border-t border-slate-50 md:border-t-0 md:table-cell md:order-none md:px-6 md:py-4 md:text-center`}
      >
        <span className="md:hidden text-xs font-semibold uppercase tracking-wider text-slate-400">
          P&L
        </span>
        <div className="flex items-center gap-2 md:inline-block font-mono text-sm font-semibold">
          <span
            className={`${pos.pnlAbsolute !== undefined ? (pos.pnlAbsolute >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-slate-600'}`}
          >
            {pos.pnlAbsolute !== undefined ? (
              <AnimatedCurrency
                value={pos.pnlAbsolute * targetMultiplier}
                currency={currency}
                showSign
              />
            ) : (
              '-'
            )}
          </span>
          {/* Percentage displayed inline only on mobile */}
          {pos.pnlPercentage !== undefined && (
            <span
              className={`md:hidden inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${pos.pnlPercentage >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
            >
              {pos.pnlPercentage > 0 ? '+' : ''}
              {pos.pnlPercentage.toFixed(2)}%
            </span>
          )}
        </div>
      </td>
      <td className="hidden md:table-cell md:px-6 md:py-4 md:text-center">
        {pos.pnlPercentage !== undefined ? (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${pos.pnlPercentage >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
          >
            {pos.pnlPercentage > 0 ? '+' : ''}
            {pos.pnlPercentage.toFixed(2)}%
          </span>
        ) : (
          '-'
        )}
      </td>
    </tr>
  );
}

export function PositionsTable({ positions, arsToUsdRate, currency }: PositionsTableProps) {
  const [localPositions, setLocalPositions] = useState<Position[]>([]);

  useEffect(() => {
    setLocalPositions(positions);
  }, [positions]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

  if (localPositions.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex justify-between w-full">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Resumen de Posiciones
          </h3>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            posiciones abiertas: {positions.length}
          </span>
        </div>
      </div>
      <div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full text-center border-collapse block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-widest">
                <th className="px-3 py-3 w-10 border-b border-slate-100"></th>
                <th className="px-6 py-3 font-semibold border-b border-slate-100 text-center">
                  Ticket
                </th>
                <th className="px-6 py-3 font-semibold border-b border-slate-100 text-center">
                  Cant. Nominales
                </th>
                <th className="px-6 py-3 font-semibold border-b border-slate-100 text-center">
                  Precio Actual
                </th>
                <th className="px-6 py-3 font-semibold border-b border-slate-100 text-center">
                  Costo Total
                </th>
                <th className="px-6 py-3 font-semibold border-b border-slate-100 text-center">
                  Valor Actual
                </th>
                <th className="px-6 py-3 font-semibold border-b border-slate-100 text-center">
                  P&L
                </th>
                <th className="px-6 py-3 font-semibold border-b border-slate-100 text-center">
                  Variación
                </th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group p-4 md:p-0 bg-slate-50/30 md:bg-transparent">
              <SortableContext
                items={localPositions.map((p) => p.ticker)}
                strategy={verticalListSortingStrategy}
              >
                {localPositions.map((pos, idx) => (
                  <SortableRow
                    key={pos.ticker}
                    pos={pos}
                    currency={currency}
                    arsToUsdRate={arsToUsdRate}
                    isLast={idx === localPositions.length - 1}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
}
