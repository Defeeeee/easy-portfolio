export interface FundQuote {
  fondo: string;
  fecha: string;
  vcp: number;
  categoria: string;
}

export interface FundMatch {
  fondo: string;
  fecha: string;
  /** VCP en la misma unidad que la columna `precio` del broker. */
  vcp: number;
  score: number;
}

const CLASS_WORDS: Record<string, string> = {
  a: 'a',
  b: 'b',
  c: 'c',
  d: 'd',
};

/**
 * Normaliza el nombre de un fondo para poder comparar el de la especie del
 * broker ("FCI COCOS PESOS PLUS CL.A $ (COCOSPPA)") con el del proveedor de
 * datos ("Cocos Pesos Plus - Clase A").
 */
export function normalizeFundName(value: string): { words: string[]; clase: string | null } {
  let text = value.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

  text = text.replace(/\([^)]*\)/g, ' '); // el ticker entre paréntesis no aporta

  let clase: string | null = null;
  const claseMatch = text.match(/\b(?:CL|CLASE)\.?\s*([A-D])\b/);
  if (claseMatch) clase = CLASS_WORDS[claseMatch[1].toLowerCase()] ?? null;

  const words = text
    .replace(/\b(?:CL|CLASE)\.?\s*[A-D]\b/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .split(' ')
    .filter(
      (w) =>
        w.length > 1 &&
        !['FCI', 'FONDO', 'COMUN', 'INVERSION', 'DE', 'ESC', 'UDS', 'USD', 'ARS'].includes(w)
    );

  return { words, clase };
}

/**
 * Busca el fondo más parecido. Exige que coincida la clase cuando ambas partes
 * la declaran: "Clase A" y "Clase B" del mismo fondo tienen VCP distinto.
 */
export function matchFund(especie: string, funds: FundQuote[]): FundMatch | null {
  const target = normalizeFundName(especie);
  if (target.words.length === 0) return null;

  let best: FundMatch | null = null;

  for (const fund of funds) {
    const candidate = normalizeFundName(fund.fondo);
    if (candidate.words.length === 0) continue;
    if (target.clase && candidate.clase && target.clase !== candidate.clase) continue;

    const shared = candidate.words.filter((w) => target.words.includes(w)).length;
    if (shared === 0) continue;

    // Proporción de palabras compartidas sobre la unión: penaliza tanto lo que
    // falta como lo que sobra, así "Cocos Ahorro" no gana contra "Cocos Pesos Plus".
    const union = new Set([...candidate.words, ...target.words]).size;
    let score = shared / union;
    if (target.clase && candidate.clase && target.clase === candidate.clase) score += 0.1;

    if (!best || score > best.score) {
      best = { fondo: fund.fondo, fecha: fund.fecha, vcp: fund.vcp, score };
    }
  }

  // Por debajo de esto la coincidencia es demasiado floja para confiar.
  return best && best.score >= 0.6 ? best : null;
}
