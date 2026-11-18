/**
 * The committee's live connection (/admin/stream). The stream itself (stream first, polling as
 * the fallback) is lib/stream/fallbackStream; this file holds what is specific to the panel.
 */
import { createContext } from 'react';

import type { AdminOverview } from '@/lib/api/types';

/** True while /admin/stream is open: the admin queries stop polling. Default: poll. */
export const AdminStreamContext = createContext(false);

/** What changed between two overviews, to refresh only the data that depends on it. */
export function overviewChanges(
  previous: AdminOverview | undefined,
  next: AdminOverview,
): { votes: boolean; candidates: boolean } {
  if (!previous) return { votes: true, candidates: true };
  return {
    votes:
      previous.turnout.votesReceived !== next.turnout.votesReceived ||
      previous.election.state !== next.election.state,
    candidates: previous.candidateCount !== next.candidateCount,
  };
}
