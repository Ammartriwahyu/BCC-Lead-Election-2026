import type { Metadata } from 'next';

import { content } from '@/content/copy';
import { CandidatesView } from '@/features/candidates/components/CandidatesView';

export const metadata: Metadata = { title: content.candidates.sectionTitle };

export default function CandidatesPage() {
  return <CandidatesView />;
}
