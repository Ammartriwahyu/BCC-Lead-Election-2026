'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createCandidate,
  deleteCandidate,
  deleteCandidatePhoto,
  updateCandidate,
  uploadCandidatePhoto,
} from '@/lib/api/endpoints';
import type { Candidate } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

import { toCandidateInput, type CandidateFormValues } from './candidateRules';

export interface SaveCandidateResult {
  candidate: Candidate;
  /** The data saved but the photo step failed (the error is kept for the photo field). */
  photoError: unknown;
}

/**
 * Save = create or update the candidate, then the photo (a separate endpoint: upload a new file
 * or delete the old one). The candidate list and the voter ballot are refetched afterwards.
 */
export function useSaveCandidate(id: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: CandidateFormValues): Promise<SaveCandidateResult> => {
      const input = toCandidateInput(values);
      let candidate = id ? await updateCandidate(id, input) : await createCandidate(input);
      let photoError: unknown = null;
      try {
        if (values.photo.kind === 'file') {
          candidate = await uploadCandidatePhoto(candidate.id, values.photo.file);
        } else if (values.photo.kind === 'none' && candidate.photoUrl) {
          candidate = await deleteCandidatePhoto(candidate.id);
        }
      } catch (error) {
        photoError = error;
      }
      return { candidate, photoError };
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.candidates }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview }),
      ]);
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCandidate(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Candidate[]>(queryKeys.admin.candidates, (list) =>
        list?.filter((c) => c.id !== id),
      );
    },
    onSettled: async () => {
      // The open Edit page keeps its (now deleted) candidate until it navigates away.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.candidates, exact: true }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview }),
      ]);
    },
  });
}
