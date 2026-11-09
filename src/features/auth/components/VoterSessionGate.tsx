'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { content } from '@/content/copy';
import { useElection } from '@/features/election/useElection';
import { useElectionAnnouncer } from '@/features/election/useElectionAnnouncer';
import { isVoterPathAllowed, voterHome } from '@/features/election/voterRouting';
import { useVoting } from '@/features/voting/VotingProvider';

import { useVoterSession } from '../useVoterSession';

function GateLoading() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center bg-bg-navy">
      <Spinner size={48} />
      <span className="sr-only">{content.loading}</span>
    </div>
  );
}

/**
 * Keeps a signed-in voter on a page that is valid for their status and the election state,
 * and follows state changes live (NOT_STARTED → OPEN, OPEN → CLOSED, reopen) without reload.
 * Redirects wait while a vote is being submitted.
 */
export function VoterSessionGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useVoterSession();
  const election = useElection();
  const { justSubmitted, isSubmitting } = useVoting();
  useElectionAnnouncer(election.data?.state);

  const ready = session.data && election.data;
  const context = ready
    ? { status: session.data.status, state: election.data.state, justSubmitted }
    : null;
  const allowed = context ? isVoterPathAllowed(pathname, context) : false;
  const home = context ? voterHome(context) : null;

  useEffect(() => {
    if (!allowed && home && !isSubmitting) router.replace(home);
  }, [allowed, home, isSubmitting, router]);

  if (!allowed && !isSubmitting) return <GateLoading />;
  return <>{children}</>;
}
