import { useEffect, useState } from 'react';

/**
 * `true` sólo después de la hidratación. Recharts mide su contenedor en el
 * cliente, así que sus gráficos no pueden renderizarse en el servidor sin
 * provocar un mismatch de hidratación.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- se ejecuta una sola vez: es la señal de que ya estamos en el cliente
  useEffect(() => setMounted(true), []);
  return mounted;
}
