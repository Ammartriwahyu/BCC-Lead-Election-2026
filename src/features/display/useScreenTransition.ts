'use client';

import { useEffect, useState } from 'react';

import { DISPLAY } from '@/config/constants';
import type { DisplayPayload } from '@/lib/api/types';

interface Layers {
  current: DisplayPayload;
  /** The screen fading out, for DISPLAY.fadeMs after a screen change. */
  leaving: DisplayPayload | null;
}

/**
 * Cross-fade only when the screen changes. Data updates on the same screen (turnout ticking up)
 * replace the content in place without a fade.
 */
export function useScreenTransition(payload: DisplayPayload): Layers {
  const [current, setCurrent] = useState(payload);
  const [leaving, setLeaving] = useState<DisplayPayload | null>(null);

  if (payload !== current) {
    if (payload.screen !== current.screen) setLeaving(current);
    setCurrent(payload);
  }

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => {
      setLeaving(null);
    }, DISPLAY.fadeMs);
    return () => {
      clearTimeout(timer);
    };
  }, [leaving]);

  return { current, leaving };
}
