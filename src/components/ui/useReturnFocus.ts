'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Controlled Radix dialogs without a <Trigger> lose focus on close. This remembers the element
 * that had focus when `open` became true and returns focus there (spec: focus back to the trigger).
 * Pass the returned handler to `onCloseAutoFocus`.
 */
export function useReturnFocus(open: boolean): (event: Event) => void {
  const previous = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (
      open &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
    ) {
      previous.current = document.activeElement;
    }
  }, [open]);

  return useCallback((event: Event) => {
    const target = previous.current;
    if (target?.isConnected) {
      event.preventDefault();
      target.focus();
    }
    previous.current = null;
  }, []);
}
