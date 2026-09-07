import { useEffect, useRef, useState } from 'react';

export function useAnimatedNumber(value: number, duration = 400) {
  const [displayValue, setDisplayValue] = useState(value);
  // Espejo del último valor emitido. Lo escribe únicamente la animación, así el
  // efecto sabe desde dónde arrancar sin tener que depender del estado.
  const emittedRef = useRef(value);

  useEffect(() => {
    const startValue = emittedRef.current;
    if (startValue === value) return;

    const emit = (next: number) => {
      emittedRef.current = next;
      setDisplayValue(next);
    };

    // Sin repintado no hay requestAnimationFrame: en una pestaña oculta la
    // animación nunca correría y el número quedaría congelado en el anterior.
    if (typeof document !== 'undefined' && document.hidden) {
      emit(value);
      return;
    }

    let startTimestamp: number | undefined;
    let animationId = 0;

    const step = (timestamp: number) => {
      if (startTimestamp === undefined) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      if (progress < 1) {
        const ease = 1 - Math.pow(1 - progress, 4); // easeOutQuart
        emit(startValue + (value - startValue) * ease);
        animationId = window.requestAnimationFrame(step);
      } else {
        emit(value);
      }
    };

    animationId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationId);
  }, [value, duration]);

  return displayValue;
}
