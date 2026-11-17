/**
 * Display control rows (Figma "Pilketum / Display control", 52:3755): what each row offers
 * for the current election state and the screen that is on air.
 */
import { ADMIN } from '@/config/constants';
import { adminCopy } from '@/content/adminCopy';
import type { DisplayScreen, ElectionState, ResultsSummary, Turnout } from '@/lib/api/types';
import { isScreenAllowed } from '@/lib/utils/display-screens';
import { formatNumber, formatPercent } from '@/lib/utils/format';

const copy = adminCopy.display;

export type DisplayRowStatus =
  { kind: 'on-screen' } | { kind: 'available' } | { kind: 'unavailable'; reason: string };

function unavailableReason(screen: DisplayScreen, state: ElectionState): string {
  switch (screen) {
    case 'OPENS_SOON':
      return copy.reasons.onlyBeforeOpen;
    case 'VOTING_OPEN':
      return state === 'NOT_STARTED' ? copy.reasons.whenOpens : copy.reasons.onlyWhileOpen;
    case 'VOTING_CLOSED':
      return copy.reasons.whenCloses;
    case 'WINNER_REVEAL':
    case 'FINAL_RESULTS':
    case 'MOST_VOTES':
      return copy.reasons.afterCloses;
  }
}

export function displayRowStatus(
  screen: DisplayScreen,
  state: ElectionState,
  activeScreen: DisplayScreen,
): DisplayRowStatus {
  if (!isScreenAllowed(screen, state)) {
    return { kind: 'unavailable', reason: unavailableReason(screen, state) };
  }
  return screen === activeScreen ? { kind: 'on-screen' } : { kind: 'available' };
}

export interface ThumbnailData {
  turnout?: Turnout | undefined;
  /** Only ever passed while voting is CLOSED. */
  results?: ResultsSummary | undefined;
}

/** Text inside the 112×64 thumbnail. Uses live numbers where the committee may see them. */
export function displayThumbnail(screen: DisplayScreen, data: ThumbnailData): string {
  if (screen === 'VOTING_OPEN' && data.turnout) return formatPercent(data.turnout.ratio);
  if (
    screen === 'FINAL_RESULTS' &&
    data.results &&
    data.results.candidates.length > 0 &&
    data.results.candidates.length <= ADMIN.thumbnailMaxCandidates
  ) {
    return data.results.candidates
      .map((candidate) => formatNumber(candidate.votes))
      .join(copy.thumbnailSeparator);
  }
  return copy.screens[screen].thumbnail;
}
