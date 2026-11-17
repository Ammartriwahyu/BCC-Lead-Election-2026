import type { Metadata } from 'next';

import { adminCopy } from '@/content/adminCopy';
import { ResultsView } from '@/features/admin/components/ResultsView';

export const metadata: Metadata = { title: adminCopy.results.title };

/** A4 · Results, locked (O · Results locked) unless voting is closed. */
export default function AdminResultsPage() {
  return <ResultsView />;
}
