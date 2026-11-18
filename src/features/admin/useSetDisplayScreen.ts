'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAnnouncer } from '@/components/ui/Announcer';
import { useToast } from '@/components/ui/Toaster';
import { adminCopy } from '@/content/adminCopy';
import { setDisplayScreen } from '@/lib/api/endpoints';
import { hasErrorCode } from '@/lib/api/errors';
import type { AdminOverview, DisplayControl, DisplayScreen } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

const copy = adminCopy;

interface Variables {
  screen: DisplayScreen;
  /** The screen on air when the member clicked (sent as `expected_screen`). */
  expected?: DisplayScreen;
}

/**
 * "Show on display": the row switches to "On screen" at once (optimistic) and rolls back if the
 * backend refuses: voting was reopened meanwhile (RESULTS_LOCKED) or another committee member put
 * a different screen on air first (DISPLAY_CHANGED -> STATE_CONFLICT). Then a toast explains and
 * the overview is refetched, so nobody overwrites someone else's choice without seeing it.
 */
export function useSetDisplayScreen() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { announce } = useAnnouncer();

  const patchDisplay = (update: (display: DisplayControl) => DisplayControl) => {
    queryClient.setQueryData<AdminOverview>(queryKeys.admin.overview, (current) =>
      current ? { ...current, display: update(current.display) } : current,
    );
  };

  return useMutation({
    mutationFn: ({ screen, expected }: Variables) => setDisplayScreen(screen, expected),
    onMutate: async ({ screen }) => {
      // A poll that is in flight would overwrite the optimistic row with the old screen.
      await queryClient.cancelQueries({ queryKey: queryKeys.admin.overview });
      const previous = queryClient.getQueryData<AdminOverview>(queryKeys.admin.overview)?.display;
      patchDisplay((display) => ({ ...display, activeScreen: screen }));
      return { previous };
    },
    onSuccess: (display, { screen }) => {
      patchDisplay(() => display);
      announce(copy.feedback.displayChanged(copy.display.screens[screen].name));
      // Not awaited: the confirm guard is released at once, the poll brings the rest.
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview });
    },
    onError: async (error, _variables, context) => {
      const previous = context?.previous;
      if (previous) patchDisplay(() => previous);
      if (hasErrorCode(error, 'UNAUTHORIZED')) return;
      if (hasErrorCode(error, 'STATE_CONFLICT', 'RESULTS_LOCKED')) {
        toast({
          title: copy.feedback.displayConflictTitle,
          description: copy.feedback.displayConflictBody,
          tone: 'info',
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview });
        return;
      }
      toast({
        title: copy.feedback.failedTitle,
        description: copy.feedback.failedBody,
        tone: 'danger',
      });
    },
  });
}
