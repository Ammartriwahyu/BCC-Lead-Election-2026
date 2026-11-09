'use client';

import { useRouter } from 'next/navigation';

import { StatusScreen } from '@/components/layout/StatusScreen';
import { VoterPageShell } from '@/components/layout/VoterPageShell';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/config/constants';
import { content } from '@/content/copy';
import { SignedInNavbar } from '@/features/auth/components/SignedInNavbar';
import { useElection } from '@/features/election/useElection';
import { useVoting } from '@/features/voting/VotingProvider';
import { hasErrorCode } from '@/lib/api/errors';
import type { Candidate } from '@/lib/api/types';

import { useCandidate } from '../useCandidates';
import { CandidateProfileHero } from './CandidateProfileHero';
import { NotOpenNote } from './NotOpenNote';
import { VisionMission } from './VisionMission';

const copy = content.candidate;

function SelectAction({
  candidate,
  fullWidth,
  onSelect,
}: {
  candidate: Candidate;
  fullWidth: boolean;
  onSelect: () => void;
}) {
  const voting = useVoting();
  const selected = voting.selectedId === candidate.id;
  if (selected) {
    return (
      <Button
        variant="dark"
        fullWidth={fullWidth}
        aria-pressed
        aria-label={content.candidates.selectedFor(candidate.name)}
        onClick={voting.clear}
      >
        {copy.selectedThis}
      </Button>
    );
  }
  return (
    <Button variant={fullWidth ? 'primary' : 'on-dark'} fullWidth={fullWidth} onClick={onSelect}>
      {copy.selectThis}
    </Button>
  );
}

/**
 * /candidates/[id]: V3 (OPEN, "Select this candidate") and V1 V&M (NOT_STARTED, not-open note),
 * MV3 (action bar) / MV1 V&M (note in the hero). Unknown id: BCC 404.
 */
export function CandidateDetailView({ id }: { id: string }) {
  const router = useRouter();
  const election = useElection();
  const candidate = useCandidate(id);
  const voting = useVoting();
  const open = election.data?.state === 'OPEN';

  function backToList() {
    if (voting.cameFromList) router.back();
    else router.replace(ROUTES.candidates);
  }

  function selectAndReturn() {
    voting.select(id);
    backToList();
  }

  if (candidate.isError && hasErrorCode(candidate.error, 'NOT_FOUND')) {
    return (
      <VoterPageShell navbar={<SignedInNavbar />} decorations="both">
        <StatusScreen
          pose="woah"
          title={content.notFound.title}
          body={<p>{content.notFound.body}</p>}
          actions={<ButtonLink href={ROUTES.candidates}>{copy.back}</ButtonLink>}
        />
      </VoterPageShell>
    );
  }

  const data = candidate.data;

  return (
    <VoterPageShell
      navbar={<SignedInNavbar />}
      tone="page"
      mainClassName={open ? 'pb-mobile-action-bar' : undefined}
    >
      {data ? (
        <>
          <CandidateProfileHero
            candidate={data}
            onBack={backToList}
            action={
              open ? (
                <SelectAction candidate={data} fullWidth={false} onSelect={selectAndReturn} />
              ) : (
                <NotOpenNote />
              )
            }
            mobileExtra={open ? undefined : <NotOpenNote />}
          />
          <VisionMission candidate={data} />
          {open ? (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border-card bg-surface-card px-16 pt-12 pb-[calc(var(--space-24)+env(safe-area-inset-bottom))] shadow-dropdown md:hidden">
              <SelectAction candidate={data} fullWidth onSelect={selectAndReturn} />
            </div>
          ) : null}
        </>
      ) : (
        <div role="status" className="flex flex-col gap-24 page-gutter py-48">
          <span className="sr-only">{content.loading}</span>
          <Skeleton className="h-280 w-full" />
          <Skeleton className="h-196 w-full" />
        </div>
      )}
    </VoterPageShell>
  );
}
