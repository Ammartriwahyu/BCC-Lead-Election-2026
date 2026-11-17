'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { POLLING } from '@/config/constants';
import { getAdminVoters } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';

/**
 * One page of the voter register (server-side search and paging). The previous page stays
 * visible while the next one loads, and the list refreshes so statuses follow the voting.
 */
export function useAdminVoters(q: string, page: number) {
  return useQuery({
    queryKey: queryKeys.admin.voters(q, page),
    queryFn: ({ signal }) => getAdminVoters({ q, page, signal }),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchInterval: POLLING.adminOverviewMs,
  });
}
