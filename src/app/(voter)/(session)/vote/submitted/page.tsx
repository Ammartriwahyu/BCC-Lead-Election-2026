import type { Metadata } from 'next';

import { content } from '@/content/copy';

import { VoteSubmittedView } from './VoteSubmittedView';

export const metadata: Metadata = { title: content.voteSubmitted.title };

export default function VoteSubmittedPage() {
  return <VoteSubmittedView />;
}
