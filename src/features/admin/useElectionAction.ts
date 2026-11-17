'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAnnouncer } from '@/components/ui/Announcer';
import { useToast } from '@/components/ui/Toaster';
import { adminCopy } from '@/content/adminCopy';
import { changeElectionState } from '@/lib/api/endpoints';
import { hasErrorCode } from '@/lib/api/errors';
import type { AdminOverview, ElectionAction, ElectionState } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

const copy = adminCopy.feedback;

/**
 * The state each action starts from. The backend refuses an action from any other state
 * (INVALID_STATE -> STATE_CONFLICT), so two committee members cannot clash.
 */
export const EXPECTED_STATE: Record<ElectionAction, ElectionState> = {
  open: 'NOT_STARTED',
  close: 'OPEN',
  reopen: 'CLOSED',
};

/**
 * Open / close / reopen voting. The backend decides: on `STATE_CONFLICT` (someone else changed
 * the state first) nothing is changed here, a toast explains and the panel refetches.
 * `CANDIDATES_INCOMPLETE` (open without three complete candidates) is shown by the dialog.
 */
export function useElectionAction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { announce } = useAnnouncer();

  return useMutation({
    mutationFn: (action: ElectionAction) => changeElectionState(action),
    onSuccess: async (election, action) => {
      queryClient.setQueryData(queryKeys.election, election);
      queryClient.setQueryData<AdminOverview>(queryKeys.admin.overview, (current) =>
        current ? { ...current, election } : current,
      );
      // Totals lock again the moment voting is not closed.
      if (election.state !== 'CLOSED') {
        queryClient.removeQueries({ queryKey: queryKeys.admin.results });
      }
      announce(copy.announce[action]);
      // The display switched screens on the server; wait so the dialog closes on fresh data.
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview });
    },
    onError: async (error) => {
      if (hasErrorCode(error, 'UNAUTHORIZED', 'CANDIDATES_INCOMPLETE')) return;
      if (hasErrorCode(error, 'STATE_CONFLICT')) {
        toast({ title: copy.conflictTitle, description: copy.conflictBody, tone: 'info' });
        await queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview });
        return;
      }
      toast({ title: copy.failedTitle, description: copy.failedBody, tone: 'danger' });
    },
  });
}
