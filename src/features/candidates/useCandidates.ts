'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY } from '@/config/constants';
import { getCandidates } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import type { Candidate } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

export function useCandidates() {
  return useQuery({
    queryKey: queryKeys.voter.candidates,
    queryFn: getCandidates,
    staleTime: QUERY.candidatesStaleMs,
  });
}

/** The API lists candidates only; one candidate comes from the list. Unknown id -> NOT_FOUND. */
async function getCandidate(id: string): Promise<Candidate> {
  const candidate = (await getCandidates()).find((c) => c.id === id);
  if (!candidate) throw new ApiError('NOT_FOUND', { status: 404 });
  return candidate;
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
