import { autoScreenFor, DISPLAY_SCREENS, isResultScreen, isScreenAllowed } from './display-screens';

describe('display screens', () => {
  it('lists six screens in design order', () => {
    expect(DISPLAY_SCREENS).toHaveLength(6);
  });

  it('switches automatically with the election state', () => {
    expect(autoScreenFor('NOT_STARTED')).toBe('OPENS_SOON');
    expect(autoScreenFor('OPEN')).toBe('VOTING_OPEN');
    expect(autoScreenFor('CLOSED')).toBe('VOTING_CLOSED');
  });

  it('only allows result screens after voting closes', () => {
    expect(isScreenAllowed('FINAL_RESULTS', 'OPEN')).toBe(false);
    expect(isScreenAllowed('FINAL_RESULTS', 'CLOSED')).toBe(true);
    expect(isScreenAllowed('OPENS_SOON', 'CLOSED')).toBe(false);
    expect(isResultScreen('MOST_VOTES')).toBe(true);
    expect(isResultScreen('WINNER_REVEAL')).toBe(false);
  });
});
