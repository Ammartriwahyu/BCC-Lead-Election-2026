import type { Metadata } from 'next';

import { content } from '@/content/copy';

import { AlreadyVotedView } from './AlreadyVotedView';

export const metadata: Metadata = { title: content.alreadyVoted.title };

export default function AlreadyVotedPage() {
  return <AlreadyVotedView />;
}
