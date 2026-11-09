'use client';

import { useEffect } from 'react';

import { StatusScreen } from '@/components/layout/StatusScreen';
import { VoterNavbar } from '@/components/layout/VoterNavbar';
import { VoterPageShell } from '@/components/layout/VoterPageShell';
import { Button } from '@/components/ui/Button';
import { content } from '@/content/copy';
import '@/styles/globals.css';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Replaces the root layout when it fails, so it renders its own <html>. Same look as error.tsx. */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <VoterPageShell navbar={<VoterNavbar />} decorations="both">
          <StatusScreen
            pose="woah"
            title={content.error.title}
            body={<p>{content.error.body}</p>}
            actions={<Button onClick={reset}>{content.error.action}</Button>}
          />
        </VoterPageShell>
      </body>
    </html>
  );
}
