import { NextResponse } from 'next/server';

const SOURCE = 'https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa';

interface MepQuote {
  fecha: string;
  compra: number;
  venta: number;
}

export interface MepPoint {
  date: string; // yyyy-mm-dd
  value: number;
}

let cache: { points: MepPoint[]; timestamp: number } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 h

/**
 * Serie histórica del dólar MEP. Sin esto toda la conversión ARS/USD usaría la
 * cotización de hoy incluso para operaciones de hace un año, que en Argentina
 * distorsiona por completo el costo en dólares.
 */
export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ points: cache.points });
    }

    const response = await fetch(SOURCE, { next: { revalidate: 21_600 } });
    if (!response.ok) {
      throw new Error(`Fuente respondió ${response.status}`);
    }

    const raw = (await response.json()) as MepQuote[];
    const points: MepPoint[] = raw
      .filter((q) => q && typeof q.fecha === 'string' && Number(q.venta) > 0)
      .map((q) => ({ date: q.fecha, value: Number(q.venta) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    cache = { points, timestamp: Date.now() };
    return NextResponse.json({ points });
  } catch (error) {
    console.error('Error en /api/mep:', error);
    // El dashboard puede seguir con la cotización spot, así que no es fatal.
    return NextResponse.json({ points: [] as MepPoint[] });
  }
}
