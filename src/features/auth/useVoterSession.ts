'use client';

import { useQuery } from '@tanstack/react-query';

import { getMe } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';

/** The signed-in voter (`GET /me`). 401 triggers the global session-expired handler. */
export function useVoterSession() {
  return useQuery({
    queryKey: queryKeys.voter.me,
    queryFn: getMe,
    staleTime: Infinity,
    retry: false,
  });
}
