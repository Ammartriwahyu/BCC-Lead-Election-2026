'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { StatusScreen } from '@/components/layout/StatusScreen';
import { VoterPageShell } from '@/components/layout/VoterPageShell';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { ROUTES } from '@/config/constants';
import { content } from '@/content/copy';
import { SignedInNavbar } from '@/features/auth/components/SignedInNavbar';
import { useOnlineStatus } from '@/features/booth/useOnlineStatus';
import { useVoting } from '@/features/voting/VotingProvider';

const copy = content.voteError;

/**
 * V4 / MV4 · Vote not submitted (Brace "Woah"). "Try again" checks the voter's status first
 * (GET /me has_voted) and only resends when the vote was not stored, so it is never sent twice.
 */
export function VoteErrorView() {
  const router = useRouter();
  const voting = useVoting();
  const online = useOnlineStatus();

  // Reached without a failed vote in memory (reload, deep link): nothing to retry.
  useEffect(() => {
    if (!voting.pendingVote && !voting.isSubmitting) router.replace(ROUTES.candidates);
  }, [router, voting.isSubmitting, voting.pendingVote]);

  return (
    <VoterPageShell navbar={<SignedInNavbar />} decorations="both">
      <StatusScreen
        pose="woah"
        title={copy.title}
        body={<p>{copy.body}</p>}
        actions={
          <>
            <Button
              loading={voting.isSubmitting}
              disabled={!online}
              onClick={() => void voting.retry()}
            >
              {copy.retry}
            </Button>
            <ButtonLink href={ROUTES.candidates} variant="secondary">
              {copy.back}
            </ButtonLink>
          </>
        }
        footnote={
          online ? null : (
            <p role="status" className="text-body-2-medium text-text-danger">
              {content.confirm.offlineHint}
            </p>
          )
        }
      />
    </VoterPageShell>
  );
}
