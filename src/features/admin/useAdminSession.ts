'use client';

import { useQuery } from '@tanstack/react-query';

import { getAdminMe } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';

/** The signed-in committee member (`GET /admin/me`). 401 triggers the session-expired handler. */
export function useAdminSession() {
  return useQuery({
    queryKey: queryKeys.admin.me,
    queryFn: getAdminMe,
    staleTime: Infinity,
    retry: false,
  });
}
