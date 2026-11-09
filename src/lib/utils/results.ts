import type { CandidateTally, ResultsSummary, Turnout } from '@/lib/api/types';

export function computeTurnout(registeredVoters: number, votesReceived: number): Turnout {
  const safeRegistered = Math.max(0, registeredVoters);
  const safeVotes = Math.min(Math.max(0, votesReceived), safeRegistered);
  return {
    registeredVoters: safeRegistered,
    votesReceived: safeVotes,
    notVoted: Math.max(0, safeRegistered - safeVotes),
    ratio: safeRegistered === 0 ? 0 : safeVotes / safeRegistered,
  };
}

type TallyInput = Omit<CandidateTally, 'share'>;

/**
 * Share = candidate votes / valid votes. Leaders = everyone tied on the top count.
 * With zero votes every share is 0 and there is no leader.
 */
export function summarizeResults(tallies: readonly TallyInput[]): ResultsSummary {
  const validVotes = tallies.reduce((sum, t) => sum + t.votes, 0);
  const candidates: CandidateTally[] = tallies
    .map((t) => ({ ...t, share: validVotes === 0 ? 0 : t.votes / validVotes }))
    .sort((a, b) => b.votes - a.votes || a.number - b.number);

  const topVotes = candidates[0]?.votes ?? 0;
  const leaders = topVotes === 0 ? [] : candidates.filter((c) => c.votes === topVotes);

  return { candidates, validVotes, leaders, isTie: leaders.length > 1 };
}
