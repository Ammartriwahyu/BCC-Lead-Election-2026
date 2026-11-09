'use client';

import { useEffect, useRef, useState } from 'react';

import { TIME } from '@/config/constants';

const TICK_MS = TIME.second / 4;

/**
 * Counts down from `seconds` while `running`, calling `onDone` once at zero.
 * Restarts from `seconds` whenever `running` turns true again. Timers stop on unmount.
 */
export function useCountdown(seconds: number, running: boolean, onDone: () => void): number {
  const [elapsed, setElapsed] = useState(0);
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!running) return undefined;
    const startedAt = Date.now();
    let finished = false;
    const id = window.setInterval(() => {
      const passed = Math.floor((Date.now() - startedAt) / TIME.second);
      setElapsed(passed);
      if (passed >= seconds && !finished) {
        finished = true;
        window.clearInterval(id);
        done.current();
      }
    }, TICK_MS);
    return () => {
      window.clearInterval(id);
      setElapsed(0);
    };
  }, [running, seconds]);

  return running ? Math.max(0, seconds - elapsed) : seconds;
}
