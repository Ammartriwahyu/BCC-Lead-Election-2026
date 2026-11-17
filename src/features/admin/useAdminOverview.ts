'use client';

import { useQuery } from '@tanstack/react-query';

import { POLLING } from '@/config/constants';
import { getAdminOverview } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';

/**
 * Election state, turnout and the screen on air, polled so the panel follows voters and other
 * committee members within 5 s (spec §4.4). Never contains candidate totals.
 */
export function useAdminOverview() {
  return useQuery({
    queryKey: queryKeys.admin.overview,
    queryFn: getAdminOverview,
    staleTime: 0,
    refetchInterval: POLLING.adminOverviewMs,
    refetchOnWindowFocus: true,
  });
}
