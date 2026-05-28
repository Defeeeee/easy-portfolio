'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Position, RawOrder } from '@/types';
import { parseOrderDate } from '@/utils/parser';
import { usePrivacy } from '@/context/PrivacyContext';

interface EvolutionChartProps {
  orders: RawOrder[];
  positions: Position[];
  arsToUsdRate: number;
  currency: 'USD' | 'ARS';
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

// Helper to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper to format date for chart
function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function formatXAxis(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [, month, year] = parts;
    return `${month}/${year}`;
  }
  return dateStr;
}

interface PriceAnchor {
  timestamp: number;
  priceUSD: number;
}

function getInterpolatedPrice(timestamp: number, anchors: PriceAnchor[]): number {
  if (!anchors || anchors.length === 0) return 0;
  if (timestamp <= anchors[0].timestamp) return anchors[0].priceUSD;
  if (timestamp >= anchors[anchors.length - 1].timestamp)
    return anchors[anchors.length - 1].priceUSD;

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (timestamp >= a.timestamp && timestamp <= b.timestamp) {
      if (b.timestamp === a.timestamp) return a.priceUSD;
      const fraction = (timestamp - a.timestamp) / (b.timestamp - a.timestamp);
      return a.priceUSD + fraction * (b.priceUSD - a.priceUSD);
    }
  }

  return anchors[anchors.length - 1].priceUSD;
}

export function EvolutionChart({ orders, positions, arsToUsdRate, currency }: EvolutionChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const { isPrivate } = usePrivacy();

  const chartData = useMemo(() => {
    if (!orders || orders.length === 0) {
      return [];
    }

    const sortedOrders = [...orders].sort(
      (a, b) => parseOrderDate(a.Concertacion).getTime() - parseOrderDate(b.Concertacion).getTime()
    );

    const firstDate = parseOrderDate(sortedOrders[0].Concertacion);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tickersWithPositions = new Map<string, Position>();
    positions.forEach((pos) => {
      tickersWithPositions.set(pos.ticker, pos);
    });

    const uniqueTickers = Array.from(new Set(orders.map((o) => o.Ticker)));
    const tickerAnchors = new Map<string, PriceAnchor[]>();

    for (const ticker of uniqueTickers) {
      const tickerOrders = sortedOrders.filter((o) => o.Ticker === ticker);
      if (tickerOrders.length === 0) continue;

      const rawAnchors: Record<number, { sumPrice: number; count: number }> = {};

      tickerOrders.forEach((order) => {
        const orderDate = parseOrderDate(order.Concertacion);
        orderDate.setHours(0, 0, 0, 0);
        const ts = orderDate.getTime();

        const isUSD =
          order.Moneda.toLowerCase().includes('dólar') ||
          order.Moneda.toLowerCase().includes('dollar');
        const rate = isUSD ? 1 : arsToUsdRate > 0 ? 1 / arsToUsdRate : 0;
        const priceUSD = Number(order.Precio) * rate;

        if (!rawAnchors[ts]) {
          rawAnchors[ts] = { sumPrice: 0, count: 0 };
        }
        rawAnchors[ts].sumPrice += priceUSD;
        rawAnchors[ts].count += 1;
      });

      const anchors: PriceAnchor[] = Object.entries(rawAnchors)
        .map(([tsStr, data]) => ({
          timestamp: Number(tsStr),
          priceUSD: data.sumPrice / data.count,
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      // Final anchor is today with current price
      const lastOrderPrice = anchors[anchors.length - 1].priceUSD;
      const pos = tickersWithPositions.get(ticker);
      const currentPriceUSD = pos?.currentPriceUSD ?? lastOrderPrice;

      const todayTimestamp = today.getTime();
      if (anchors[anchors.length - 1].timestamp < todayTimestamp) {
        anchors.push({
          timestamp: todayTimestamp,
          priceUSD: currentPriceUSD,
        });
      } else {
        if (pos?.currentPriceUSD !== undefined) {
          anchors[anchors.length - 1].priceUSD = pos.currentPriceUSD;
        }
      }

      tickerAnchors.set(ticker, anchors);
    }

    // 2. Build the daily timeline
    const timeline: any[] = [];
    let cumulativeInvestedUSD = 0;
    const currentHoldings: Record<string, number> = {};
    const costBasisHoldings: Record<string, number> = {};

    let orderIndex = 0;

    for (let d = new Date(firstDate); d <= today; d = addDays(d, 1)) {
      const dateStr = formatDate(d);

      while (orderIndex < sortedOrders.length) {
        const order = sortedOrders[orderIndex];
        const orderDate = parseOrderDate(order.Concertacion);

        if (orderDate.getTime() > d.getTime()) {
          break;
        }

        if (orderDate.getTime() === d.getTime()) {
          const isUSD =
            order.Moneda.toLowerCase().includes('dólar') ||
            order.Moneda.toLowerCase().includes('dollar');
          const rate = isUSD ? 1 : arsToUsdRate > 0 ? 1 / arsToUsdRate : 0;
          const orderNetoUSD = Number(order.Neto) * rate;

          if (order.Tipo === 'COMPRA') {
            cumulativeInvestedUSD += orderNetoUSD;
            currentHoldings[order.Ticker] = (currentHoldings[order.Ticker] || 0) + order.Cantidad;
            costBasisHoldings[order.Ticker] = (costBasisHoldings[order.Ticker] || 0) + orderNetoUSD;
          } else if (order.Tipo === 'VENTA') {
            const qty = currentHoldings[order.Ticker] || 0;
            const avgPriceUSD = qty > 0 ? (costBasisHoldings[order.Ticker] || 0) / qty : 0;

            currentHoldings[order.Ticker] -= order.Cantidad;
            costBasisHoldings[order.Ticker] -= order.Cantidad * avgPriceUSD;
            cumulativeInvestedUSD -= order.Cantidad * avgPriceUSD;

            if (currentHoldings[order.Ticker] <= 0) {
              currentHoldings[order.Ticker] = 0;
              costBasisHoldings[order.Ticker] = 0;
            }
          }
        }
        orderIndex++;
      }

      // Calculate actual portfolio value on this day
      let actualValueUSD = 0;
      for (const [ticker, qty] of Object.entries(currentHoldings)) {
        if (qty > 0) {
          const anchors = tickerAnchors.get(ticker) || [];
          const priceUSD = getInterpolatedPrice(d.getTime(), anchors);
          actualValueUSD += qty * priceUSD;
        }
      }

      timeline.push({
        date: dateStr,
        timestamp: d.getTime(),
        investedUSD: Math.max(0, cumulativeInvestedUSD),
        actualValueUSD: Math.max(0, actualValueUSD),
      });
    }

    if (timeline.length > 0) {
      const lastPoint = timeline[timeline.length - 1];
      let exactActualValueUSD = 0;
      let exactInvestedUSD = 0;

      for (const [ticker, qty] of Object.entries(currentHoldings)) {
        if (qty > 0) {
          const pos = tickersWithPositions.get(ticker);
          if (pos) {
            exactActualValueUSD += pos.currentValueUSD || pos.investedValueUSD;
            exactInvestedUSD += pos.investedValueUSD;
          }
        }
      }

      if (exactActualValueUSD > 0) {
        lastPoint.actualValueUSD = exactActualValueUSD;
      }
      if (exactInvestedUSD > 0) {
        lastPoint.investedUSD = exactInvestedUSD;
      }
    }

    return timeline;
  }, [orders, positions, arsToUsdRate]);

  const filteredData = useMemo(() => {
    if (chartData.length === 0) return [];
    if (timeRange === 'ALL') return chartData;

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);

    switch (timeRange) {
      case '1M':
        cutoff.setMonth(cutoff.getMonth() - 1);
        break;
      case '3M':
        cutoff.setMonth(cutoff.getMonth() - 3);
        break;
      case '6M':
        cutoff.setMonth(cutoff.getMonth() - 6);
        break;
      case '1Y':
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        break;
    }

    const cutoffTime = cutoff.getTime();
    const filtered = chartData.filter((p) => p.timestamp >= cutoffTime);

    return filtered.length > 0 ? filtered : chartData;
  }, [chartData, timeRange]);

  if (filteredData.length === 0) return null;

  // Transform data based on selected currency
  const displayData = filteredData.map((point) => {
    const multiplier = currency === 'USD' ? 1 : arsToUsdRate;
    return {
      ...point,
      Invertido: point.investedUSD * multiplier,
      Actual: point.actualValueUSD * multiplier,
    };
  });

  const currencyPrefix = currency === 'USD' ? 'US$ ' : 'AR$ ';
  const formatYAxis = (value: number) => {
    if (isPrivate) return '***';
    if (value >= 1000000) return `${currencyPrefix}${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${currencyPrefix}${(value / 1000).toFixed(0)}k`;
    return `${currencyPrefix}${value}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Evolución del Portafolio
          </h3>
          <div className="flex items-center gap-4 text-xs mt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block" />
              <span className="text-slate-600 font-medium">Valor Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block" />
              <span className="text-slate-500 font-medium">Capital Invertido</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg self-start md:self-auto">
          {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${
                timeRange === range
                  ? 'text-slate-900 font-semibold bg-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6 h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              tickFormatter={formatXAxis}
              minTickGap={30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              tickFormatter={formatYAxis}
              width={80}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const invertidoItem = payload.find((p) => p.dataKey === 'Invertido');
                  const actualItem = payload.find((p) => p.dataKey === 'Actual');

                  if (!invertidoItem || !actualItem) return null;

                  const valInvertido = Number(invertidoItem.value);
                  const valActual = Number(actualItem.value);

                  const pnlAbsolute = valActual - valInvertido;
                  const pnlPercentage = valInvertido > 0 ? (pnlAbsolute / valInvertido) * 100 : 0;
                  const isProfit = pnlAbsolute >= 0;

                  const formatVal = (val: number) => {
                    return val.toLocaleString(currency === 'USD' ? 'en-US' : 'es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                  };

                  return (
                    <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-lg min-w-[220px]">
                      <p className="text-sm font-semibold text-slate-700 mb-3 border-b border-slate-100 pb-1.5">
                        {label}
                      </p>
                      <div className="space-y-2.5">
                        {/* Valor Actual */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="text-xs font-medium text-slate-500">Valor Actual</span>
                          </div>
                          <span className="text-sm font-bold text-slate-800">
                            {isPrivate ? '***' : `${currencyPrefix}${formatVal(valActual)}`}
                          </span>
                        </div>

                        {/* Capital Invertido */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-0.5 border-t border-dashed border-amber-500" />
                            <span className="text-xs font-medium text-slate-500">
                              Cap. Invertido
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-600">
                            {isPrivate ? '***' : `${currencyPrefix}${formatVal(valInvertido)}`}
                          </span>
                        </div>

                        {/* Rendimiento */}
                        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-2">
                          <span className="text-xs font-medium text-slate-500">Rendimiento</span>
                          <span
                            className={`text-xs font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}
                          >
                            {isPrivate ? (
                              '***'
                            ) : (
                              <>
                                {isProfit ? '+' : ''}
                                {currencyPrefix}
                                {formatVal(pnlAbsolute)} ({isProfit ? '+' : ''}
                                {pnlPercentage.toFixed(2)}%)
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="Invertido"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fillOpacity={0}
              name="Capital Invertido"
            />
            <Area
              type="monotone"
              dataKey="Actual"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorActual)"
              name="Valor Actual"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
