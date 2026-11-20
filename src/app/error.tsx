'use client';

import { useEffect } from 'react';

import { StatusScreen } from '@/components/layout/StatusScreen';
import { VoterNavbar } from '@/components/layout/VoterNavbar';
import { VoterPageShell } from '@/components/layout/VoterPageShell';
import { Button } from '@/components/ui/Button';
import { commonCopy } from '@/content/commonCopy';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** NEW (not in Figma): route error boundary in the V6 status style. See DEVIATIONS. */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <VoterPageShell navbar={<VoterNavbar />} decorations="both">
      <StatusScreen
        pose="woah"
        title={commonCopy.error.title}
        body={<p>{commonCopy.error.body}</p>}
        actions={<Button onClick={reset}>{commonCopy.error.action}</Button>}
      />
    </VoterPageShell>
  );
}
