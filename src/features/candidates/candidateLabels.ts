import { content } from '@/content/copy';
import type { Candidate } from '@/lib/api/types';
import { formatCandidateNumber } from '@/lib/utils/format';

/** "Candidate 01" */
export function candidateNumberLabel(candidate: Pick<Candidate, 'number'>): string {
  return content.candidates.numberLabel(formatCandidateNumber(candidate.number));
}

/** "Information Systems, class of 2023" */
export function candidateDetails(candidate: Pick<Candidate, 'major' | 'classYear'>): string {
  return content.candidates.details(candidate.major, candidate.classYear);
}
