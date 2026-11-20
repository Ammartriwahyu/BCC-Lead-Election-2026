import type { AdminOverview } from '@/lib/api/types';

import { overviewChanges } from './adminStream';

const overview = (votes: number, candidates = 3): AdminOverview => ({
  election: { state: 'OPEN' },
  turnout: {
    registeredVoters: 139,
    votesReceived: votes,
    notVoted: 139 - votes,
    ratio: votes / 139,
  },
  candidateCount: candidates,
  display: { activeScreen: 'VOTING_OPEN' },
  candidatesLocked: true,
});

describe('overviewChanges', () => {
  it('refreshes votes on a new vote or a state change, candidates on a new count', () => {
    expect(overviewChanges(undefined, overview(1))).toEqual({ votes: true, candidates: true });
    expect(overviewChanges(overview(1), overview(1))).toEqual({ votes: false, candidates: false });
    expect(overviewChanges(overview(1), overview(2))).toEqual({ votes: true, candidates: false });
    expect(overviewChanges(overview(1), { ...overview(1), election: { state: 'CLOSED' } })).toEqual(
      { votes: true, candidates: false },
    );
    expect(overviewChanges(overview(1, 3), overview(1, 2))).toEqual({
      votes: false,
      candidates: true,
    });
  });
});
