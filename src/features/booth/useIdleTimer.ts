'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = [
  'pointerdown',
  'pointermove',
  'keydown',
  'wheel',
  'touchstart',
  'scroll',
] as const;

/**
 * True after `timeoutMs` without user activity. `reset()` starts a new idle period.
 * Listeners and the timer are removed on unmount or when disabled (no leaks between voters).
 */
export function useIdleTimer(
  enabled: boolean,
  timeoutMs: number,
): { idle: boolean; reset: () => void } {
  const [idle, setIdle] = useState(false);
  const timer = useRef<number | null>(null);
  const idleRef = useRef(false);

  const schedule = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      idleRef.current = true;
      setIdle(true);
    }, timeoutMs);
  }, [timeoutMs]);

  const reset = useCallback(() => {
    idleRef.current = false;
    setIdle(false);
    schedule();
  }, [schedule]);

  useEffect(() => {
    if (!enabled) {
      if (timer.current !== null) window.clearTimeout(timer.current);
      idleRef.current = false;
      return undefined;
    }
    // Activity only postpones the timer while the voter is not idle; once idle, the dialog decides.
    const onActivity = () => {
      if (!idleRef.current) schedule();
    };
    schedule();
    ACTIVITY_EVENTS.forEach((type) => {
      window.addEventListener(type, onActivity, { passive: true, capture: true });
    });
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((type) => {
        window.removeEventListener(type, onActivity, { capture: true });
      });
    };
  }, [enabled, schedule]);

  return { idle: enabled && idle, reset };
}
