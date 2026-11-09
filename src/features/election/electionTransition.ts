import type { ElectionState } from '@/lib/api/types';

export type ElectionTransition = 'opened' | 'closed' | 'reopened';

/** Classifies a state change for the polite announcement voters hear (spec §4.2). */
export function electionTransition(
  previous: ElectionState | undefined,
  next: ElectionState,
): ElectionTransition | null {
  if (!previous || previous === next) return null;
  if (next === 'CLOSED') return 'closed';
  if (next === 'OPEN') return previous === 'CLOSED' ? 'reopened' : 'opened';
  return null;
}
