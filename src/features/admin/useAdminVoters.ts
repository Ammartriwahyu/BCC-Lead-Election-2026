'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useContext } from 'react';

import { POLLING } from '@/config/constants';
import { getAdminVoters } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';

import { AdminStreamContext } from './adminStream';

/**
 * One page of the voter register (server-side search and paging). The previous page stays
 * visible while the next one loads. Statuses follow the voting: refreshed when the committee
 * stream reports a new vote, polled every 4 s while there is no stream.
 */
export function useAdminVoters(q: string, page: number) {
  const streaming = useContext(AdminStreamContext);
  return useQuery({
    queryKey: queryKeys.admin.voters(q, page),
    queryFn: ({ signal }) => getAdminVoters({ q, page, signal }),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchInterval: streaming ? false : POLLING.adminOverviewMs,
  });
}
