'use client';

import { useEffect, useRef } from 'react';

import { useAnnouncer } from '@/components/ui/Announcer';
import { content } from '@/content/copy';
import type { ElectionState } from '@/lib/api/types';

import { electionTransition } from './electionTransition';

/** Announces opened / closed / reopened through the polite live region, once per change. */
export function useElectionAnnouncer(state: ElectionState | undefined): void {
  const { announce } = useAnnouncer();
  const previous = useRef<ElectionState | undefined>(state);

  useEffect(() => {
    if (!state) return;
    const transition = electionTransition(previous.current, state);
    previous.current = state;
    if (transition) announce(content.election.announce[transition]);
  }, [announce, state]);
}
