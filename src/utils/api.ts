export async function fetchDolarRate(): Promise<number> {
  try {
    const response = await fetch('https://dolarapi.com/v1/dolares/bolsa');
    if (!response.ok) {
      throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    return data.venta;
  } catch (error) {
    console.error('Error obteniendo Dólar MEP:', error);
    throw error;
  }
}

export async function fetchCurrentPrices(
  tickers: string[]
): Promise<Record<string, { price: number; currency: string }>> {
  if (!tickers || tickers.length === 0) return {};

  try {
    const response = await fetch('/api/prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tickers }),
    });

    if (!response.ok) {
      throw new Error(`Error fetching prices: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in fetchCurrentPrices:', error);
    return {};
  }
}

export interface HistoryPointDTO {
  date: string;
  close: number;
}

export interface HistorySeriesDTO {
  currency: string;
  points: HistoryPointDTO[];
}

export async function fetchPriceHistory(
  tickers: string[],
  from?: string
): Promise<Record<string, HistorySeriesDTO>> {
  if (!tickers || tickers.length === 0) return {};

  try {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers, from }),
    });
    if (!response.ok) throw new Error(`Error fetching history: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error in fetchPriceHistory:', error);
    return {};
  }
}

export async function fetchMepSeries(): Promise<{ date: string; value: number }[]> {
  try {
    const response = await fetch('/api/mep');
    if (!response.ok) throw new Error(`Error fetching MEP series: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data.points) ? data.points : [];
  } catch (error) {
    console.error('Error in fetchMepSeries:', error);
    return [];
  }
}

export interface FundQuoteDTO {
  fondo: string;
  fecha: string;
  vcp: number;
  categoria: string;
}

export async function fetchFundQuotes(): Promise<FundQuoteDTO[]> {
  try {
    const response = await fetch('/api/fci');
    if (!response.ok) throw new Error(`Error fetching FCI: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data.funds) ? data.funds : [];
  } catch (error) {
    console.error('Error in fetchFundQuotes:', error);
    return [];
  }
}

export async function fetchInflation(): Promise<{ date: string; monthly: number }[]> {
  try {
    const response = await fetch('/api/inflation');
    if (!response.ok) throw new Error(`Error fetching inflation: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data.points) ? data.points : [];
  } catch (error) {
    console.error('Error in fetchInflation:', error);
    return [];
  }
}
