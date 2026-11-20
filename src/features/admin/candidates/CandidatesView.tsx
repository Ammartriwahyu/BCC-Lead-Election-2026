'use client';

import { Brace } from '@/components/layout/Brace';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { CANDIDATE, ROUTES } from '@/config/constants';
import { candidatesCopy } from '@/content/candidatesCopy';

import { AdminLoadError } from '../components/AdminLoadError';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminPageSkeleton } from '../components/AdminPageSkeleton';
import { useAdminOverview } from '../useAdminOverview';
import { CandidateRow } from './CandidateRow';
import { useAdminCandidates } from './useAdminCandidates';

const copy = candidatesCopy;

/**
 * A6 · Candidates (150:3971 not started, 150:4528 open, 150:4622 closed, 150:4472 empty).
 * Add / Edit only while voting has never opened; afterwards the ballot is read-only for good.
 */
export function CandidatesView() {
  const overview = useAdminOverview();
  const candidates = useAdminCandidates();

  if (!overview.data || !candidates.data) {
    return overview.isError || candidates.isError ? (
      <AdminLoadError
        onRetry={() => {
          void overview.refetch();
          void candidates.refetch();
        }}
      />
    ) : (
      <AdminPageSkeleton />
    );
  }

  const { election, candidatesLocked } = overview.data;
  const editable = election.state === 'NOT_STARTED' && !candidatesLocked;
  const list = candidates.data;
  const full = list.length >= CANDIDATE.ballotNumbers.length;

  const noteId = 'candidates-note';
  // Ballot numbers 1–3 are all used: Add stays visible (Figma) but explains why it can't be used.
  const addButton = full ? (
    <Button disabled aria-describedby={noteId}>
      {copy.add}
    </Button>
  ) : (
    <ButtonLink href={ROUTES.adminCandidateNew}>{copy.add}</ButtonLink>
  );

  return (
    <>
      <AdminPageHeader
        title={copy.title}
        state={election.state}
        subtitle={copy.subtitle[election.state]}
        actions={editable && list.length > 0 ? addButton : undefined}
      />

      {editable ? null : <Alert tone="locked">{copy.locked[election.state]}</Alert>}

      {list.length === 0 ? (
        <section className="flex flex-col items-center gap-16 rounded-xl border border-border-card bg-surface-card px-24 py-40 text-center">
          <Brace pose="hello" width={110} />
          <h2 className="text-heading-5 text-text-primary">{copy.empty.title}</h2>
          <p className="text-body-2 text-text-secondary">{copy.empty.body}</p>
          {editable ? addButton : null}
        </section>
      ) : (
        <ul aria-label={copy.title} className="flex motion-stagger flex-col gap-16">
          {list.map((candidate) => (
            <CandidateRow key={candidate.id} candidate={candidate} editable={editable} />
          ))}
        </ul>
      )}

      {editable && list.length > 0 ? (
        <Alert tone="info" id={noteId}>
          {full ? `${copy.note} ${copy.full}` : copy.note}
        </Alert>
      ) : null}
    </>
  );
}
