/** What the Open voting dialog and the candidate list need, without the form (JS budget). */
import { CANDIDATE } from '@/config/constants';
import { adminCopy } from '@/content/adminCopy';
import { candidateNumberLabel } from '@/features/candidates/candidateLabels';
import type { Candidate } from '@/lib/api/types';

/** A candidate members can vote for: the backend's only missing piece is the photo. */
export const isCandidateComplete = (candidate: Candidate) => candidate.photoUrl !== null;

/** Why voting cannot open yet (backend: exactly 3 candidates, each with a photo), or null. */
export function openVotingBlocker(candidates: readonly Candidate[]): string | null {
  const copy = adminCopy.dialogs.open;
  if (candidates.length !== CANDIDATE.requiredCount) {
    return copy.blockedCount(candidates.length, CANDIDATE.requiredCount);
  }
  const missing = candidates.filter((c) => !isCandidateComplete(c));
  if (missing.length > 0) {
    return copy.blockedPhotos(missing.map((c) => candidateNumberLabel(c)).join(', '));
  }
  return null;
}
