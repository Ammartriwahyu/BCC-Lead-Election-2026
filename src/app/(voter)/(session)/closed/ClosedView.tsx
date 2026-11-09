'use client';

import { StatusScreen } from '@/components/layout/StatusScreen';
import { VoterPageShell } from '@/components/layout/VoterPageShell';
import { content } from '@/content/copy';
import { SignedInNavbar } from '@/features/auth/components/SignedInNavbar';
import { SignOutButton } from '@/features/auth/components/SignOutButton';

const copy = content.closed;

/**
 * V6 / MV6 · Voting closed (Brace "Glory"). If the committee reopens voting, the session gate
 * moves a voter who has not voted back to /candidates without a reload.
 */
export function ClosedView() {
  return (
    <VoterPageShell navbar={<SignedInNavbar />} decorations="both">
      <StatusScreen
        pose="glory"
        title={copy.title}
        body={<p>{copy.body}</p>}
        actions={<SignOutButton variant="primary" />}
      />
    </VoterPageShell>
  );
}
