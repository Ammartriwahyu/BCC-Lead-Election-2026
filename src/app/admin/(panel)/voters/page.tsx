import type { Metadata } from 'next';
import { Suspense } from 'react';

import { adminCopy } from '@/content/adminCopy';
import { VotersView } from '@/features/admin/components/VotersView';

export const metadata: Metadata = { title: adminCopy.voters.title };

/** A5 · Voter list (`?q=&page=`). */
export default function AdminVotersPage() {
  return (
    <Suspense>
      <VotersView />
    </Suspense>
  );
}
