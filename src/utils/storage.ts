import { CashMovement, RawOrder } from '../types';
import { BrokerType } from '@/constants/brokers';

const KEY = 'easy-portfolio:session';
const VERSION = 1;

export interface StoredSession {
  version: number;
  broker: BrokerType;
  orders: RawOrder[];
  cash: CashMovement[];
  fileNames: string[];
  savedAt: string;
}

/**
 * Guarda lo *parseado*, no el archivo: alcanza para rearmar el dashboard sin
 * volver a subir nada, y sigue siendo todo local al navegador.
 */
export function saveSession(session: Omit<StoredSession, 'version' | 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredSession = {
      ...session,
      version: VERSION,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch (error) {
    // Cuota llena o almacenamiento bloqueado: no es motivo para romper nada.
    console.warn('No se pudo guardar la sesión:', error);
  }
}

export function loadSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed.version !== VERSION || !Array.isArray(parsed.orders)) return null;
    if (parsed.orders.length === 0) return null;
    return { ...parsed, cash: Array.isArray(parsed.cash) ? parsed.cash : [] };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // sin storage no hay nada que limpiar
  }
}
