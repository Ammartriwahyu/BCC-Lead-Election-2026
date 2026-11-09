'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Subscribes to a CSS media query. Returns `serverValue` during SSR and the first client render. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Below the md breakpoint (768 px) the voter UI uses the mobile frames (bottom sheets, action bar). */
export const MOBILE_QUERY = '(max-width: 767.98px)';
