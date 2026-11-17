import type { Metadata } from 'next';

import { candidateFormCopy } from '@/content/candidateFormCopy';
import { CandidateFormPage } from '@/features/admin/candidates/CandidateFormPage';

export const metadata: Metadata = { title: candidateFormCopy.form.addTitle };

/** A7 · Add candidate. */
export default function AdminNewCandidatePage() {
  return <CandidateFormPage id={null} />;
}
