import type { Metadata } from 'next';

import { candidatesCopy } from '@/content/candidatesCopy';
import { CandidatesView } from '@/features/admin/candidates/CandidatesView';

export const metadata: Metadata = { title: candidatesCopy.title };

/** A6 · Candidates. */
export default function AdminCandidatesPage() {
  return <CandidatesView />;
}
