'use client';

import { useEffect, useState } from 'react';

import { MobileActionBar } from '@/components/layout/MobileActionBar';
import { VoterPageShell } from '@/components/layout/VoterPageShell';
import { Alert } from '@/components/ui/Alert';
import { useAnnouncer } from '@/components/ui/Announcer';
import { Button } from '@/components/ui/Button';
import { content } from '@/content/copy';
import { SignedInNavbar } from '@/features/auth/components/SignedInNavbar';
import { useElection } from '@/features/election/useElection';
import { ConfirmVoteDialog } from '@/features/voting/components/ConfirmVoteDialog';
import { useVoting } from '@/features/voting/VotingProvider';
import { cx } from '@/lib/utils/cx';

import { useCandidates } from '../useCandidates';
import { CandidateCard, type CandidateCardStatus } from './CandidateCard';
import { CandidateGridSkeleton } from './CandidateGridSkeleton';
import { CandidatesHero } from './CandidatesHero';
import { PickBar } from './PickBar';

const copy = content.candidates;

/**
 * /candidates: V1 (NOT_STARTED, read-only, Locked cards) and V2 (OPEN, pick + review),
 * MV1/MV2 below 768 px. Switches mode live when the election state changes (no reload).
 */
export function CandidatesView() {
  const election = useElection();
  const candidates = useCandidates();
  const voting = useVoting();
  const { announce } = useAnnouncer();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { setCameFromList } = voting;

  const open = election.data?.state === 'OPEN';
  const list = candidates.data ?? [];
  const pick = open ? list.find((c) => c.id === voting.selectedId) : undefined;

  useEffect(() => {
    setCameFromList(false);
  }, [setCameFromList]);

  // Voting closed while the dialog was up: hide it at once (the gate then redirects to /closed).
  const dialogOpen = confirmOpen && (open || voting.isSubmitting);

  function statusOf(id: string): CandidateCardStatus {
    if (!open) return 'locked';
    return id === voting.selectedId ? 'selected' : 'default';
  }

  function toggle(id: string, name: string) {
    if (voting.selectedId === id) {
      voting.clear();
      announce(copy.announceCleared);
    } else {
      voting.select(id);
      announce(copy.announcePicked(name));
    }
  }

  async function submit() {
    const result = await voting.submit();
    if (result === 'stayed') setConfirmOpen(false);
  }

  return (
    <VoterPageShell
      navbar={<SignedInNavbar />}
      tone="page"
      mainClassName={cx(open && 'pb-mobile-action-bar')}
    >
      <CandidatesHero open={open} />

      <section
        aria-labelledby="candidates-title"
        className="flex flex-col gap-16 px-16 pt-24 pb-32 md:gap-24 md:page-gutter md:py-48"
      >
        <div className="flex items-center justify-between gap-16 md:items-end">
          <h2 id="candidates-title" className="text-heading-5 text-text-primary md:text-heading-3">
            {copy.sectionTitle}
          </h2>
          <p className="text-body-2 text-text-secondary md:text-body-1">
            <span className="md:hidden">{copy.countMobile}</span>
            <span className="hidden md:inline">{copy.count(list.length)}</span>
          </p>
        </div>

        {candidates.isPending ? <CandidateGridSkeleton /> : null}
        {candidates.isError ? (
          <Alert tone="danger" role="alert">
            <div className="flex flex-wrap items-center justify-between gap-12">
              <span>{copy.loadError}</span>
              <Button variant="secondary" onClick={() => void candidates.refetch()}>
                {copy.retry}
              </Button>
            </div>
          </Alert>
        ) : null}

        {list.length > 0 ? (
          <ul className="grid motion-stagger gap-16 md:grid-cols-2 md:gap-24 lg:grid-cols-3 lg:gap-40">
            {list.map((candidate) => (
              <li key={candidate.id}>
                <CandidateCard
                  candidate={candidate}
                  status={statusOf(candidate.id)}
                  onToggle={() => {
                    toggle(candidate.id, candidate.name);
                  }}
                  onOpenDetails={() => {
                    setCameFromList(true);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {open ? (
        <div className="page-gutter pb-48 max-md:hidden">
          <PickBar
            pick={pick}
            disabled={voting.isSubmitting}
            onReview={() => {
              setConfirmOpen(true);
            }}
          />
        </div>
      ) : null}

      {open ? (
        <MobileActionBar
          label={copy.yourPick}
          value={pick ? pick.name : copy.noPickMobile}
          action={
            <Button
              disabled={!pick || voting.isSubmitting}
              onClick={() => {
                setConfirmOpen(true);
              }}
            >
              {copy.reviewAndSubmitMobile}
            </Button>
          }
        />
      ) : null}

      {pick ? (
        <ConfirmVoteDialog
          candidate={pick}
          open={dialogOpen}
          onOpenChange={setConfirmOpen}
          submitting={voting.isSubmitting}
          onSubmit={() => void submit()}
        />
      ) : null}
    </VoterPageShell>
  );
}
