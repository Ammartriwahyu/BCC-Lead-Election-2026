import { computeTurnout, summarizeResults } from './results';

const tally = (number: number, votes: number) => ({
  candidateId: `c${number}`,
  number,
  name: `Candidate ${number}`,
  major: 'Information Systems',
  classYear: 2023,
  photoUrl: null,
  votes,
});

describe('computeTurnout', () => {
  it('matches the design notes example (240 / 300 = 80%)', () => {
    expect(computeTurnout(300, 240)).toEqual({
      registeredVoters: 300,
      votesReceived: 240,
      notVoted: 60,
      ratio: 0.8,
    });
  });

  it('returns 0 for an empty register', () => {
    expect(computeTurnout(0, 0).ratio).toBe(0);
  });

  it('clamps impossible values', () => {
    expect(computeTurnout(10, 12)).toMatchObject({ votesReceived: 10, notVoted: 0, ratio: 1 });
    expect(computeTurnout(10, -3)).toMatchObject({ votesReceived: 0, notVoted: 10 });
  });
});

describe('summarizeResults', () => {
  it('computes shares from valid votes and sorts by votes', () => {
    const summary = summarizeResults([tally(2, 72), tally(1, 132), tally(3, 36)]);
    expect(summary.validVotes).toBe(240);
    expect(summary.candidates.map((c) => c.number)).toEqual([1, 2, 3]);
    expect(summary.candidates[0]?.share).toBeCloseTo(0.55);
    expect(summary.leaders.map((c) => c.number)).toEqual([1]);
    expect(summary.isTie).toBe(false);
  });

  it('has no leader and 0% shares with zero votes', () => {
    const summary = summarizeResults([tally(1, 0), tally(2, 0)]);
    expect(summary.leaders).toEqual([]);
    expect(summary.isTie).toBe(false);
    expect(summary.candidates.every((c) => c.share === 0)).toBe(true);
  });

  it('returns every tied leader', () => {
    const summary = summarizeResults([tally(1, 50), tally(2, 50), tally(3, 10)]);
    expect(summary.isTie).toBe(true);
    expect(summary.leaders.map((c) => c.number)).toEqual([1, 2]);
  });

  it('keeps candidate order on equal votes', () => {
    const summary = summarizeResults([tally(3, 5), tally(1, 5)]);
    expect(summary.candidates.map((c) => c.number)).toEqual([1, 3]);
  });

  it('handles a single candidate and an empty list', () => {
    expect(summarizeResults([tally(1, 3)]).leaders).toHaveLength(1);
    expect(summarizeResults([])).toEqual({
      candidates: [],
      validVotes: 0,
      leaders: [],
      isTie: false,
    });
  });
});
