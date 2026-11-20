import { commonCopy } from '@/content/commonCopy';
import type { Candidate } from '@/lib/api/types';
import { formatCandidateNumber } from '@/lib/utils/format';

/** "Candidate 01" */
export function candidateNumberLabel(candidate: Pick<Candidate, 'number'>): string {
  return commonCopy.candidateNumber(formatCandidateNumber(candidate.number));
}

/** "Information Systems, class of 2023" */
export function candidateDetails(candidate: Pick<Candidate, 'major' | 'classYear'>): string {
  return commonCopy.candidateDetails(candidate.major, candidate.classYear);
}
