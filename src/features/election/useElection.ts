'use client';

import { useQuery } from '@tanstack/react-query';

import { POLLING } from '@/config/constants';
import { getElection } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';

/**
 * Election state, polled every ~5 s while the tab is visible and refetched when it regains focus
 * (TanStack pauses intervals in background tabs). State changes are never time-based (spec §3).
 */
export function useElection(options: { poll?: boolean } = {}) {
  const { poll = true } = options;
  return useQuery({
    queryKey: queryKeys.election,
    queryFn: getElection,
    staleTime: 0,
    refetchInterval: poll ? POLLING.electionStateMs : false,
    refetchOnWindowFocus: true,
  });
}
