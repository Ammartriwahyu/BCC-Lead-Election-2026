'use client';

import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';

import { POLLING } from '@/config/constants';
import { getElection } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';

/**
 * Whether the pages under it still poll the election state. The voter session gate turns it off
 * while /election/stream is open, and once the voter has voted (nothing they see depends on the
 * state then). Default: poll.
 */
export const ElectionPollingContext = createContext(true);

/**
 * Election state, polled every ~5 s while the tab is visible (unless the voter stream carries it,
 * see ElectionPollingContext) and refetched when it regains focus (TanStack pauses intervals in
 * background tabs). State changes are never time-based (spec §3).
 */
export function useElection(options: { poll?: boolean } = {}) {
  const { poll = true } = options;
  const allowed = useContext(ElectionPollingContext);
  return useQuery({
    queryKey: queryKeys.election,
    queryFn: getElection,
    staleTime: 0,
    refetchInterval: poll && allowed ? POLLING.electionStateMs : false,
    refetchOnWindowFocus: true,
  });
}
