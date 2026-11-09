import type { Metadata } from 'next';

import { content } from '@/content/copy';

import { ClosedView } from './ClosedView';

export const metadata: Metadata = { title: content.closed.title };

export default function ClosedPage() {
  return <ClosedView />;
}
