'use client';

import { useRef } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Dialog } from '@/components/ui/Dialog';
import { ROUTES } from '@/config/constants';
import { adminCopy } from '@/content/adminCopy';
import { hasErrorCode } from '@/lib/api/errors';
import type { ElectionAction, Turnout } from '@/lib/api/types';
import { formatNumber } from '@/lib/utils/format';

import { openVotingBlocker } from '../candidates/openVoting';
import { useAdminCandidates } from '../candidates/useAdminCandidates';
import { useElectionAction } from '../useElectionAction';

const copy = adminCopy.dialogs;

interface ElectionActionDialogProps {
  /** Which confirmation to show. Kept while closing so the text does not change mid-way. */
  action: ElectionAction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Live turnout for the summary box (Close and Reopen). */
  turnout: Turnout;
  /** Called after the backend confirmed the new state. */
  onDone?: (action: ElectionAction) => void;
}

function summaryFor(action: ElectionAction, turnout: Turnout) {
  const voted = formatNumber(turnout.votesReceived);
  const notVoted = formatNumber(turnout.notVoted);
  if (action === 'close') {
    return {
      title: copy.close.summaryTitle(voted, formatNumber(turnout.registeredVoters)),
      text: copy.close.summaryText(turnout.notVoted, notVoted),
    };
  }
  if (action === 'reopen') {
    return {
      title: copy.reopen.summaryTitle(turnout.votesReceived, voted),
      text: copy.reopen.summaryText(turnout.notVoted, notVoted),
    };
  }
  return null;
}

/**
 * O · Open voting (42:2490), O · Close voting (42:2506), O · Reopen voting (61:3745).
 * Every state change is confirmed here. While the request runs the dialog cannot be closed and
 * the buttons are disabled, so a double click sends one request (spec §4.4).
 */
export function ElectionActionDialog({
  action,
  open,
  onOpenChange,
  turnout,
  onDone,
}: ElectionActionDialogProps) {
  const mutation = useElectionAction();
  const summary = summaryFor(action, turnout);
  // Spec 4.4: Open voting is refused with the reason while candidates are missing or incomplete.
  const candidates = useAdminCandidates();
  const blocker = action === 'open' && candidates.data ? openVotingBlocker(candidates.data) : null;
  // `isPending` only changes on the next render; a ref also stops the second click of a double click.
  const inFlight = useRef(false);

  const confirm = () => {
    if (inFlight.current) return;
    inFlight.current = true;
    mutation.mutate(action, {
      onSettled: () => {
        inFlight.current = false;
      },
      onSuccess: () => {
        onOpenChange(false);
        onDone?.(action);
      },
      onError: (error) => {
        // Someone else already changed the state: this confirmation no longer applies.
        if (hasErrorCode(error, 'STATE_CONFLICT')) onOpenChange(false);
        // The backend found incomplete candidates: refetch so the reason shows here.
        if (hasErrorCode(error, 'CANDIDATES_INCOMPLETE')) void candidates.refetch();
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!mutation.isPending}
      title={copy[action].title}
      description={copy[action].body}
      actions={
        <>
          <Button
            variant="secondary"
            disabled={mutation.isPending}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {copy.cancel}
          </Button>
          {blocker ? (
            <ButtonLink href={ROUTES.adminCandidates}>{copy.open.blockedLink}</ButtonLink>
          ) : (
            <Button loading={mutation.isPending} onClick={confirm}>
              {copy[action].confirm}
            </Button>
          )}
        </>
      }
    >
      {blocker ? (
        <Alert tone="danger" role="alert">
          {blocker}
        </Alert>
      ) : null}
      {summary ? (
        <div className="flex w-full flex-col rounded-lg bg-bg-subtle py-12 pr-16 pl-12">
          <p className="text-body-1-semibold text-text-primary">{summary.title}</p>
          <p className="text-body-2 text-text-secondary">{summary.text}</p>
        </div>
      ) : null}
    </Dialog>
  );
}
