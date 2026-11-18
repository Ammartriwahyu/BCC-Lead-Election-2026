import type { Metadata } from 'next';

import { candidatesCopy } from '@/content/candidatesCopy';
import { CandidateFormPage } from '@/features/admin/candidates/CandidateFormPage';

export const metadata: Metadata = { title: candidatesCopy.edit };

interface EditCandidatePageProps {
  params: Promise<{ id: string }>;
}

/** A8 · Edit candidate. */
export default async function AdminEditCandidatePage({ params }: EditCandidatePageProps) {
  const { id } = await params;
  return <CandidateFormPage id={decodeURIComponent(id)} />;
}
