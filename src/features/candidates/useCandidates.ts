'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY } from '@/config/constants';
import { getCandidate, getCandidates } from '@/lib/api/endpoints';
import type { Candidate } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

export function useCandidates() {
  return useQuery({
    queryKey: queryKeys.voter.candidates,
    queryFn: getCandidates,
    staleTime: QUERY.candidatesStaleMs,
  });
}

/** One candidate; served from the list cache when the voter came from /candidates. */
export function useCandidate(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.voter.candidate(id),
    queryFn: () => getCandidate(id),
    staleTime: QUERY.candidatesStaleMs,
    retry: false,
    initialData: () =>
      queryClient.getQueryData<Candidate[]>(queryKeys.voter.candidates)?.find((c) => c.id === id),
  });
}
