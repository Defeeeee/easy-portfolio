import { NextResponse } from 'next/server';

const SOURCE = 'https://api.argentinadatos.com/v1/finanzas/indices/inflacion';

interface RawInflation {
  fecha: string;
  valor: number;
}

export interface InflationPoint {
  date: string;
  /** Variación mensual del IPC, en porcentaje. */
  monthly: number;
}

let cache: { points: InflationPoint[]; timestamp: number } | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000;

/** IPC mensual, para poder mostrar rendimientos en pesos reales. */
export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ points: cache.points });
    }

    const response = await fetch(SOURCE, { next: { revalidate: 86_400 } });
    if (!response.ok) throw new Error(`Fuente respondió ${response.status}`);

    const raw = (await response.json()) as RawInflation[];
    const points = raw
      .filter((p) => p && typeof p.fecha === 'string' && Number.isFinite(Number(p.valor)))
      .map<InflationPoint>((p) => ({ date: p.fecha, monthly: Number(p.valor) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    cache = { points, timestamp: Date.now() };
    return NextResponse.json({ points });
  } catch (error) {
    console.error('Error en /api/inflation:', error);
    return NextResponse.json({ points: [] as InflationPoint[] });
  }
}
