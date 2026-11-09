import { ROUTES } from '@/config/constants';
import { isApiError } from '@/lib/api/errors';

/** What the UI does after a failed POST /votes (spec §4.2, docs/API_CONTRACT.md). */
export type SubmitFailure =
  | { kind: 'navigate'; to: string; refetch: 'me' | 'election' | null }
  | { kind: 'stay'; refetch: 'election' | 'candidates' }
  | { kind: 'session' };

export function classifySubmitError(error: unknown): SubmitFailure {
  if (!isApiError(error)) return { kind: 'navigate', to: ROUTES.voteError, refetch: null };
  switch (error.code) {
    case 'ALREADY_VOTED':
      return { kind: 'navigate', to: ROUTES.alreadyVoted, refetch: 'me' };
    case 'VOTING_CLOSED':
      return { kind: 'navigate', to: ROUTES.closed, refetch: 'election' };
    case 'VOTING_NOT_OPEN':
      return { kind: 'stay', refetch: 'election' };
    case 'VALIDATION':
    case 'NOT_FOUND':
      // The candidate list changed under the voter: drop the pick and reload it.
      return { kind: 'stay', refetch: 'candidates' };
    case 'UNAUTHORIZED':
      return { kind: 'session' };
    default:
      // NETWORK, TIMEOUT, 5xx, UNKNOWN: the vote may or may not be stored. Show V4 first;
      // "Try again" checks the voter's status before resending (Design notes: Submit errors).
      return { kind: 'navigate', to: ROUTES.voteError, refetch: null };
  }
}
