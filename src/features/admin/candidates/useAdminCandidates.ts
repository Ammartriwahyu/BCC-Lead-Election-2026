'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getAdminCandidate, getAdminCandidates } from '@/lib/api/endpoints';
import type { Candidate } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

export function useAdminCandidates() {
  return useQuery({
    queryKey: queryKeys.admin.candidates,
    queryFn: getAdminCandidates,
    staleTime: 0,
  });
}

/** One candidate for the Edit page; starts from the list cache when the list was open. */
export function useAdminCandidate(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.admin.candidate(id),
    queryFn: () => getAdminCandidate(id),
    enabled: id !== '',
    retry: false,
    initialData: () =>
      queryClient.getQueryData<Candidate[]>(queryKeys.admin.candidates)?.find((c) => c.id === id),
  });
}
