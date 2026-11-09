import type { Metadata } from 'next';

import { content } from '@/content/copy';

import { VoteErrorView } from './VoteErrorView';

export const metadata: Metadata = { title: content.voteError.title };

export default function VoteErrorPage() {
  return <VoteErrorView />;
}
