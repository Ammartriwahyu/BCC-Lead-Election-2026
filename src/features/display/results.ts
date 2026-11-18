/** Pure layout rules for the result screens (D3 Final results, D4 Most votes). */
import { DISPLAY } from '@/config/constants';
import type { CandidateTally, ResultsSummary } from '@/lib/api/types';

/**
 * Podium order (D3): second place left, first in the middle, third right.
 * Input is ranked (most votes first). One candidate stands alone; two stand second | first.
 */
export function podiumOrder<T>(ranked: readonly T[]): T[] {
  const [first, second, third] = ranked;
  if (first === undefined) return [];
  if (second === undefined) return [first];
  if (third === undefined) return [second, first];
  return [second, first, third];
}

/** Bar height in px: the top share gets the full height, the others scale with their share. */
export function podiumBarHeight(share: number, topShare: number): number {
  if (topShare <= 0) return DISPLAY.podiumMinBarPx;
  const height = Math.round((share / topShare) * DISPLAY.podiumMaxBarPx);
  return Math.max(DISPLAY.podiumMinBarPx, Math.min(DISPLAY.podiumMaxBarPx, height));
}

/** Width of a ranked bar (more than three candidates), relative to the top share. 0..1 */
export function rankedBarRatio(share: number, topShare: number): number {
  return topShare <= 0 ? 0 : Math.min(1, share / topShare);
}

export type ResultsLayout = 'podium' | 'ranked';

export function resultsLayout(candidates: readonly CandidateTally[]): ResultsLayout {
  return candidates.length > DISPLAY.podiumMaxColumns ? 'ranked' : 'podium';
}

/** Leaders by id. Empty with zero votes, two or more on a tie. */
export function leaderIds(results: ResultsSummary): Set<string> {
  return new Set(results.leaders.map((leader) => leader.candidateId));
}
