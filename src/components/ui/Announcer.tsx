'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { UI } from '@/config/constants';

type Politeness = 'polite' | 'assertive';

interface AnnouncerApi {
  announce: (message: string, politeness?: Politeness) => void;
}

const AnnouncerContext = createContext<AnnouncerApi | null>(null);

/**
 * Global aria-live regions for state changes that have no visible focus target
 * (voting opened/closed, submitting, errors). Mounted once in the root providers.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    const set = politeness === 'polite' ? setPolite : setAssertive;
    set('');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      set(message);
    }, UI.announceResetMs);
  }, []);

  const api = useMemo(() => ({ announce }), [announce]);

  return (
    <AnnouncerContext.Provider value={api}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="announcer-polite">
        {polite}
      </div>
      <div
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="announcer-assertive"
      >
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnouncer(): AnnouncerApi {
  const api = useContext(AnnouncerContext);
  if (!api) throw new Error('useAnnouncer must be used inside <AnnouncerProvider>');
  return api;
}
