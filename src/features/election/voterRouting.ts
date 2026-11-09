/**
 * Where a signed-in voter may be, given their status and the election state.
 * Pure functions: the session gate, sign-in and the submit flow all use these.
 */
import { ROUTES } from '@/config/constants';
import type { ElectionState, VoterStatus } from '@/lib/api/types';

export interface VoterContext {
  status: VoterStatus;
  state: ElectionState;
  /** True right after this device submitted, so the voter lands on "Thanks" instead of "Already voted". */
  justSubmitted?: boolean;
}

/** Page the voter should see when they are not on an allowed page. */
export function voterHome({ status, state, justSubmitted = false }: VoterContext): string {
  if (status === 'VOTED') return justSubmitted ? ROUTES.voteSubmitted : ROUTES.alreadyVoted;
  if (state === 'CLOSED') return ROUTES.closed;
  return ROUTES.candidates;
}

function isCandidatePath(pathname: string): boolean {
  return pathname === ROUTES.candidates || pathname.startsWith(`${ROUTES.candidates}/`);
}

/** Whether `pathname` is valid for the voter right now (spec §3 and §4.2). */
export function isVoterPathAllowed(pathname: string, { status, state }: VoterContext): boolean {
  if (status === 'VOTED')
    return pathname === ROUTES.voteSubmitted || pathname === ROUTES.alreadyVoted;
  if (state === 'CLOSED') return pathname === ROUTES.closed;
  if (isCandidatePath(pathname)) return true;
  // The error page only makes sense while voting is open (retry needs OPEN).
  return pathname === ROUTES.voteError && state === 'OPEN';
}

/**
 * `?next=` after sign-in: only same-site voter paths that are valid for the current state.
 * Anything else (absolute URLs, //host, admin pages, invalid for state) falls back to voterHome.
 */
export function resolveNextPath(next: string | null | undefined, context: VoterContext): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return voterHome(context);
  }
  let pathname: string;
  try {
    pathname = new URL(next, 'http://localhost').pathname;
  } catch {
    return voterHome(context);
  }
  if (pathname === ROUTES.voteError || pathname === ROUTES.voteSubmitted) return voterHome(context);
  return isVoterPathAllowed(pathname, context) ? next : voterHome(context);
}
