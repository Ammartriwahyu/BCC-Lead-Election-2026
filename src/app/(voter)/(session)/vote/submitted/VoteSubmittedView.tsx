'use client';

import { StatusScreen } from '@/components/layout/StatusScreen';
import { VoterPageShell } from '@/components/layout/VoterPageShell';
import { content } from '@/content/copy';
import { SignedInNavbar } from '@/features/auth/components/SignedInNavbar';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { useVoterSession } from '@/features/auth/useVoterSession';
import { AutoSignOutNotice } from '@/features/booth/components/AutoSignOutNotice';
import { SubmittedAtDetail } from '@/features/voting/components/SubmittedAtDetail';

const copy = content.voteSubmitted;

/** V5 / MV5 · Vote submitted (Brace "Glory"). Booth mode signs out after 10 s. */
export function VoteSubmittedView() {
  const { data } = useVoterSession();
  return (
    <VoterPageShell navbar={<SignedInNavbar />} decorations="both">
      <StatusScreen
        pose="glory"
        title={copy.title}
        body={<p>{copy.body}</p>}
        detail={<SubmittedAtDetail submittedAt={data?.submittedAt} />}
        actions={<SignOutButton variant="primary" />}
        footnote={<AutoSignOutNotice />}
      />
    </VoterPageShell>
  );
}
