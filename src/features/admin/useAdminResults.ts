'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getAdminResults } from '@/lib/api/endpoints';
import { hasErrorCode } from '@/lib/api/errors';
import type { ElectionState } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

/**
 * Candidate totals. Privacy rule: fetched only while the backend says voting is CLOSED, and
 * dropped from memory as soon as it is not (reopen), so totals never linger on screen.
 */
export function useAdminResults(state: ElectionState | undefined) {
  const queryClient = useQueryClient();
  const closed = state === 'CLOSED';

  useEffect(() => {
    if (state !== undefined && !closed) {
      queryClient.removeQueries({ queryKey: queryKeys.admin.results });
    }
  }, [closed, queryClient, state]);

  const query = useQuery({
    queryKey: queryKeys.admin.results,
    queryFn: getAdminResults,
    enabled: closed,
    staleTime: 0,
  });

  // The backend refused (someone reopened voting): refresh the state this page relies on.
  const locked = hasErrorCode(query.error, 'RESULTS_LOCKED');
  useEffect(() => {
    if (locked) void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview });
  }, [locked, queryClient]);

  return query;
}
