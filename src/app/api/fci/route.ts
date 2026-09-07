import { NextResponse } from 'next/server';

const CATEGORIES = ['mercadoDinero', 'rentaFija', 'rentaVariable', 'rentaMixta'] as const;
const BASE = 'https://api.argentinadatos.com/v1/finanzas/fci';

interface RawFund {
  fondo: string;
  fecha: string;
  vcp: number;
  patrimonio?: number;
}

export interface FundQuote {
  fondo: string;
  fecha: string;
  vcp: number;
  categoria: string;
}

let cache: { funds: FundQuote[]; timestamp: number } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000;

/**
 * Valor de cuotaparte de los fondos comunes. Los FCI no cotizan en el proveedor
 * de precios bursátiles, así que sin esto la única valuación posible es el
 * precio de la última suscripción del propio usuario.
 */
export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ funds: cache.funds });
    }

    const responses = await Promise.allSettled(
      CATEGORIES.map(async (categoria) => {
        const res = await fetch(`${BASE}/${categoria}/ultimo`, { next: { revalidate: 21_600 } });
        if (!res.ok) throw new Error(`${categoria} respondió ${res.status}`);
        const raw = (await res.json()) as RawFund[];
        return raw
          .filter((f) => f && typeof f.fondo === 'string' && Number(f.vcp) > 0)
          .map<FundQuote>((f) => ({
            fondo: f.fondo,
            fecha: f.fecha,
            vcp: Number(f.vcp),
            categoria,
          }));
      })
    );

    const funds = responses.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    if (funds.length > 0) cache = { funds, timestamp: Date.now() };

    return NextResponse.json({ funds });
  } catch (error) {
    console.error('Error en /api/fci:', error);
    // Sin esto la app sigue valuando con el último precio operado.
    return NextResponse.json({ funds: [] as FundQuote[] });
  }
}
