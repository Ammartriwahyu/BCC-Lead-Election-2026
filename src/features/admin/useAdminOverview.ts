'use client';

import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';

import { POLLING } from '@/config/constants';
import { getAdminOverview } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';

import { AdminStreamContext } from './adminStream';

/**
 * Election state, turnout and the screen on air, so the panel follows voters and other committee
 * members (spec §4.4). Pushed by /admin/stream while it is healthy (AdminStreamProvider), polled
 * every 4 s otherwise. Never contains candidate totals.
 */
export function useAdminOverview() {
  const streaming = useContext(AdminStreamContext);
  return useQuery({
    queryKey: queryKeys.admin.overview,
    queryFn: getAdminOverview,
    staleTime: 0,
    refetchInterval: streaming ? false : POLLING.adminOverviewMs,
    refetchOnWindowFocus: true,
  });
}
