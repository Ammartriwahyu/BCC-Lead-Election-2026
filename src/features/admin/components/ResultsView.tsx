'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/config/constants';
import { adminCopy } from '@/content/adminCopy';
import { hasErrorCode } from '@/lib/api/errors';
import type { ElectionAction } from '@/lib/api/types';
import { formatNumber } from '@/lib/utils/format';

import { useAdminOverview } from '../useAdminOverview';
import { useAdminResults } from '../useAdminResults';
import { AdminLoadError } from './AdminLoadError';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminPageSkeleton } from './AdminPageSkeleton';
import { ExportResultsButton } from './ExportResultsButton';
import { LazyDisplayControlCard } from './LazyDisplayControlCard';
import { LazyElectionActionDialog } from './LazyElectionActionDialog';
import { ResultRow } from './ResultRow';
import { ResultsLockedDialog } from './ResultsLockedDialog';

const copy = adminCopy.results;

/**
 * A4 · Results (43:3129) and O · Results locked (42:2522).
 * - Not started: "Results are locked", back to the overview.
 * - Open (NEW, DEVIATIONS #86): live totals per candidate for the committee, refreshed every few
 *   seconds, with Close voting. Still anonymous; the display and the export wait for closing.
 * - Closed: final totals, Export and Reopen voting (A4).
 */
export function ResultsView() {
  const router = useRouter();
  const overview = useAdminOverview();
  const state = overview.data?.election.state;
  const results = useAdminResults(state, 'live');
  const [dialogOpen, setDialogOpen] = useState(false);
  // Fixed on click: the dialog text must not switch when the state changes under it.
  const [action, setAction] = useState<ElectionAction>('close');

  if (!overview.data) {
    return overview.isError ? (
      <AdminLoadError onRetry={() => void overview.refetch()} />
    ) : (
      <AdminPageSkeleton />
    );
  }

  const open = state === 'OPEN';
  const next = open ? 'close' : 'reopen';
  // The backend may keep totals until closing (BACKEND_QUESTIONS #14): say so instead of an error.
  const unavailable = open && hasErrorCode(results.error, 'RESULTS_LOCKED');
  const data = results.data;
  const counted = data ? data.results.validVotes : overview.data.turnout.votesReceived;

  let body: ReactNode;
  if (!open && state !== 'CLOSED') {
    body = (
      <ResultsLockedDialog
        open
        onOpenChange={() => {
          router.replace(ROUTES.adminOverview);
        }}
      />
    );
  } else if (!data && !unavailable) {
    body = results.isError ? (
      <AdminLoadError onRetry={() => void results.refetch()} />
    ) : (
      <AdminPageSkeleton />
    );
  } else {
    const summary = data?.results;
    const leaders = new Set(summary?.leaders.map((leader) => leader.candidateId));
    body = (
      <>
        <AdminPageHeader
          title={copy.title}
          state={state}
          subtitle={(open && data ? copy.liveSubtitle : copy.subtitle)(
            counted,
            formatNumber(counted),
            formatNumber(overview.data.turnout.registeredVoters),
          )}
          actions={
            <>
              {open ? null : <ExportResultsButton />}
              <Button
                variant="secondary"
                onClick={() => {
                  setAction(next);
                  setDialogOpen(true);
                }}
              >
                {adminCopy.overview.actions[next]}
              </Button>
            </>
          }
        />
        {unavailable ? (
          <Alert tone="info" role="status">
            {copy.liveUnavailable}
          </Alert>
        ) : null}
        {data?.integrityOk === false ? (
          <Alert tone="danger" role="alert">
            {copy.integrity}
          </Alert>
        ) : null}
        {summary ? (
          <ol aria-label={copy.listLabel} className="flex motion-stagger flex-col gap-16">
            {summary.candidates.map((tally) => (
              <ResultRow
                key={tally.candidateId}
                tally={tally}
                leading={leaders.has(tally.candidateId)}
                tied={summary.isTie}
              />
            ))}
          </ol>
        ) : null}
        <LazyDisplayControlCard overview={overview.data} results={summary} />
        {summary ? (
          <Alert tone="info">{open ? copy.liveNote : copy.note(formatNumber(counted))}</Alert>
        ) : null}
      </>
    );
  }

  return (
    <>
      {body}
      {/* Stays mounted while the state changes under it, so the confirmation can finish. */}
      <LazyElectionActionDialog
        action={action}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        turnout={overview.data.turnout}
      />
    </>
  );
}
