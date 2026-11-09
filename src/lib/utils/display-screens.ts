import type { DisplayScreen, ElectionState } from '@/lib/api/types';

/** Display control rows, in the order the design lists them. */
export const DISPLAY_SCREENS: readonly DisplayScreen[] = [
  'OPENS_SOON',
  'VOTING_OPEN',
  'VOTING_CLOSED',
  'WINNER_REVEAL',
  'FINAL_RESULTS',
  'MOST_VOTES',
];

/** Screens that may be on air in each election state. */
const ALLOWED: Record<ElectionState, readonly DisplayScreen[]> = {
  NOT_STARTED: ['OPENS_SOON'],
  OPEN: ['VOTING_OPEN'],
  CLOSED: ['VOTING_CLOSED', 'WINNER_REVEAL', 'FINAL_RESULTS', 'MOST_VOTES'],
};

/** The screen the display switches to automatically when the state changes. */
export function autoScreenFor(state: ElectionState): DisplayScreen {
  if (state === 'NOT_STARTED') return 'OPENS_SOON';
  if (state === 'OPEN') return 'VOTING_OPEN';
  return 'VOTING_CLOSED';
}

export function isScreenAllowed(screen: DisplayScreen, state: ElectionState): boolean {
  return ALLOWED[state].includes(screen);
}

/** Screens that reveal candidate totals. They only go on air after an explicit "Show on display". */
export function isResultScreen(screen: DisplayScreen): boolean {
  return screen === 'FINAL_RESULTS' || screen === 'MOST_VOTES';
}
