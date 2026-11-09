import type { Metadata } from 'next';

import { content } from '@/content/copy';
import { CandidateDetailView } from '@/features/candidates/components/CandidateDetailView';

export const metadata: Metadata = { title: content.candidates.visionMission };

interface CandidatePageProps {
  params: Promise<{ id: string }>;
}

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  return <CandidateDetailView id={decodeURIComponent(id)} />;
}
