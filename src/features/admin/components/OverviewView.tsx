'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { ROUTES } from '@/config/constants';
import { adminCopy } from '@/content/adminCopy';
import type { ElectionAction, ElectionState } from '@/lib/api/types';

import { useAdminOverview } from '../useAdminOverview';
import { useAdminResults } from '../useAdminResults';
import { AdminLoadError } from './AdminLoadError';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminPageSkeleton } from './AdminPageSkeleton';
import { LazyDisplayControlCard } from './LazyDisplayControlCard';
import { LazyElectionActionDialog } from './LazyElectionActionDialog';
import { OverviewStats } from './OverviewStats';
import { TurnoutCard } from './TurnoutCard';
import { VotingStatusCard } from './VotingStatusCard';

const copy = adminCopy.overview;

/** The one state change each state offers as its main action. */
const NEXT_ACTION: Record<ElectionState, ElectionAction> = {
  NOT_STARTED: 'open',
  OPEN: 'close',
  CLOSED: 'reopen',
};

/**
 * A1 · Overview (not started) 42:2246, A2 (open) 42:2323, A3 (closed) 42:2411.
 * One page that follows the backend state; turnout is live. No candidate totals here except the
 * Final results thumbnail, which is filled only after voting has closed.
 */
export function OverviewView() {
  const overview = useAdminOverview();
  const state = overview.data?.election.state;
  const results = useAdminResults(state, 'final');
  const [dialogOpen, setDialogOpen] = useState(false);
  // The action is fixed when the dialog opens, so its text cannot switch while it closes.
  const [dialogAction, setDialogAction] = useState<ElectionAction>('open');

  if (!overview.data) {
    return overview.isError ? (
      <AdminLoadError onRetry={() => void overview.refetch()} />
    ) : (
      <AdminPageSkeleton />
    );
  }

  const { election, turnout } = overview.data;
  const action = NEXT_ACTION[election.state];
  const askToConfirm = () => {
    setDialogAction(action);
    setDialogOpen(true);
  };

  return (
    <>
      <AdminPageHeader
        title={copy.title}
        state={election.state}
        subtitle={copy.subtitle[election.state]}
        actions={
          election.state === 'CLOSED' ? (
            <>
              <Button variant="secondary" onClick={askToConfirm}>
                {copy.actions.reopen}
              </Button>
              <ButtonLink href={ROUTES.adminResults}>{copy.actions.viewResults}</ButtonLink>
            </>
          ) : (
            <Button onClick={askToConfirm}>{copy.actions[action]}</Button>
          )
        }
      />
      <OverviewStats overview={overview.data} />
      {election.state === 'OPEN' ? <TurnoutCard turnout={turnout} /> : null}
      <LazyDisplayControlCard overview={overview.data} results={results.data?.results} />
      <VotingStatusCard state={election.state} />
      <LazyElectionActionDialog
        action={dialogAction}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        turnout={turnout}
      />
    </>
  );
}
