'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/config/constants';
import { adminCopy } from '@/content/adminCopy';
import { formatNumber } from '@/lib/utils/format';

import { useAdminOverview } from '../useAdminOverview';
import { useAdminResults } from '../useAdminResults';
import { AdminLoadError } from './AdminLoadError';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminPageSkeleton } from './AdminPageSkeleton';
import { DisplayControlCard } from './DisplayControlCard';
import { ExportResultsButton } from './ExportResultsButton';
import { LazyElectionActionDialog } from './LazyElectionActionDialog';
import { ResultRow } from './ResultRow';
import { ResultsLockedDialog } from './ResultsLockedDialog';

const copy = adminCopy.results;

/**
 * A4 · Results (43:3129) and O · Results locked (42:2522).
 * Candidate totals are requested only while the backend state is CLOSED. In any other state this
 * page shows "Results are locked" and returns to the overview; reopening does the same.
 */
export function ResultsView() {
  const router = useRouter();
  const overview = useAdminOverview();
  const state = overview.data?.election.state;
  const results = useAdminResults(state);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopened, setReopened] = useState(false);

  if (!overview.data) {
    return overview.isError ? (
      <AdminLoadError onRetry={() => void overview.refetch()} />
    ) : (
      <AdminPageSkeleton />
    );
  }

  let body: ReactNode;
  if (state !== 'CLOSED') {
    // Reopened from this page: on the way to the overview, nothing to explain.
    body =
      reopenOpen || reopened ? (
        <AdminPageSkeleton />
      ) : (
        <ResultsLockedDialog
          open
          onOpenChange={() => {
            router.replace(ROUTES.adminOverview);
          }}
        />
      );
  } else if (!results.data) {
    body = results.isError ? (
      <AdminLoadError onRetry={() => void results.refetch()} />
    ) : (
      <AdminPageSkeleton />
    );
  } else {
    const { results: summary, turnout } = results.data;
    const leaders = new Set(summary.leaders.map((leader) => leader.candidateId));
    body = (
      <>
        <AdminPageHeader
          title={copy.title}
          state={state}
          subtitle={copy.subtitle(
            summary.validVotes,
            formatNumber(summary.validVotes),
            formatNumber(turnout.registeredVoters),
          )}
          actions={
            <>
              <ExportResultsButton />
              <Button
                variant="secondary"
                onClick={() => {
                  setReopenOpen(true);
                }}
              >
                {adminCopy.overview.actions.reopen}
              </Button>
            </>
          }
        />
        {results.data.integrityOk ? null : (
          <Alert tone="danger" role="alert">
            {copy.integrity}
          </Alert>
        )}
        <ol aria-label={copy.listLabel} className="flex flex-col gap-16">
          {summary.candidates.map((tally) => (
            <ResultRow
              key={tally.candidateId}
              tally={tally}
              leading={leaders.has(tally.candidateId)}
              tied={summary.isTie}
            />
          ))}
        </ol>
        <DisplayControlCard overview={overview.data} results={summary} />
        <Alert tone="info">{copy.note(formatNumber(summary.validVotes))}</Alert>
      </>
    );
  }

  return (
    <>
      {body}
      {/* Stays mounted while the state changes under it, so the confirmation can finish. */}
      <LazyElectionActionDialog
        action="reopen"
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        turnout={overview.data.turnout}
        onDone={() => {
          setReopened(true);
          router.replace(ROUTES.adminOverview);
        }}
      />
    </>
  );
}
