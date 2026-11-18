'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext, useEffect } from 'react';

import { POLLING } from '@/config/constants';
import { getAdminResults } from '@/lib/api/endpoints';
import { hasErrorCode } from '@/lib/api/errors';
import type { ElectionState } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

import { AdminStreamContext } from './adminStream';

/**
 * - `final`: only once voting is CLOSED (overview thumbnails of the result screens).
 * - `live`: the Results page also follows the count while voting is OPEN (committee decision
 *   18 Nov 2026, DEVIATIONS #86): refreshed when the committee stream reports a new vote, or every
 *   POLLING.adminLiveResultsMs while there is no stream. Ballots stay anonymous: only totals.
 */
export type ResultsMode = 'final' | 'live';

/**
 * Candidate totals for the committee. Never requested before voting opens, and dropped from memory
 * whenever this mode may not show them, so totals never linger on screen. The public display and
 * the export still wait for CLOSED (backend RESULTS_LOCKED).
 */
export function useAdminResults(state: ElectionState | undefined, mode: ResultsMode = 'final') {
  const queryClient = useQueryClient();
  const streaming = useContext(AdminStreamContext);
  const live = mode === 'live' && state === 'OPEN';
  const enabled = state === 'CLOSED' || live;

  useEffect(() => {
    if (state !== undefined && !enabled) {
      queryClient.removeQueries({ queryKey: queryKeys.admin.results });
    }
  }, [enabled, queryClient, state]);

  const query = useQuery({
    queryKey: queryKeys.admin.results,
    queryFn: getAdminResults,
    enabled,
    staleTime: 0,
    // Live: poll while open, but stop if the backend refuses totals before closing.
    refetchInterval: (current) =>
      live && !streaming && !hasErrorCode(current.state.error, 'RESULTS_LOCKED')
        ? POLLING.adminLiveResultsMs
        : false,
  });

  // Refused although the page thought it could show totals: refresh the state it relies on.
  const locked = hasErrorCode(query.error, 'RESULTS_LOCKED');
  useEffect(() => {
    if (locked) void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview });
  }, [locked, queryClient]);

  return query;
}
