'use client';

/**
 * Browser behaviour of the videotron page: scale-to-fit, idle cursor, F for fullscreen and a
 * screen wake lock. Each hook cleans up after itself; none of them is required for the content.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';

import { DISPLAY } from '@/config/constants';

/** Uniform scale that fits the 1920×1080 stage inside the window (letterboxed). */
export function fitScale(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 0;
  return Math.min(width / DISPLAY.width, height / DISPLAY.height);
}

function subscribeResize(onChange: () => void): () => void {
  window.addEventListener('resize', onChange);
  return () => {
    window.removeEventListener('resize', onChange);
  };
}

/** null during server rendering, so the stage stays hidden until it can be sized. */
export function useStageScale(): number | null {
  return useSyncExternalStore(
    subscribeResize,
    () => fitScale(window.innerWidth, window.innerHeight),
    () => null,
  );
}

/** True after the mouse has been still for DISPLAY.hideCursorAfterMs. */
export function useIdleCursor(): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let timer = setTimeout(() => {
      setHidden(true);
    }, DISPLAY.hideCursorAfterMs);
    const onMove = () => {
      setHidden(false);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setHidden(true);
      }, DISPLAY.hideCursorAfterMs);
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return hidden;
}

/** "F" toggles fullscreen (Esc leaves it, as browsers do). */
export function useFullscreenKey(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'f' || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      } else {
        void document.documentElement.requestFullscreen().catch(() => undefined);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}

/** Keeps the laptop screen on while the page is visible. Silently does nothing where unsupported. */
export function useWakeLock(): void {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return undefined;
    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || sentinel) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (!active) {
          void lock.release();
          return;
        }
        sentinel = lock;
        lock.addEventListener('release', () => {
          sentinel = null;
        });
      } catch {
        // Denied (battery saver, no user gesture yet): the screen may dim, nothing else breaks.
      }
    };

    // The lock is dropped whenever the tab is hidden; take it again when it comes back.
    const onVisibility = () => void acquire();
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
    };
  }, []);
}
