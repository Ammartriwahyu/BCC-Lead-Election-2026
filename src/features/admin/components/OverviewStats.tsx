import { StatCard } from '@/components/ui/StatCard';
import { adminCopy } from '@/content/adminCopy';
import type { AdminOverview } from '@/lib/api/types';
import { cx } from '@/lib/utils/cx';
import { formatNumber, formatPercent } from '@/lib/utils/format';

const copy = adminCopy.overview.stats;

interface Stat {
  label: string;
  value: string;
  note?: string;
}

function statsFor({ election, turnout, candidateCount }: AdminOverview): Stat[] {
  const registered = formatNumber(turnout.registeredVoters);
  const votes = formatNumber(turnout.votesReceived);
  if (election.state === 'NOT_STARTED') {
    return [
      { label: copy.registered, value: registered, note: copy.registeredNote },
      { label: copy.candidates, value: formatNumber(candidateCount), note: copy.candidatesNote },
      { label: copy.votes, value: votes, note: copy.votesNote },
    ];
  }
  const closed = election.state === 'CLOSED';
  return [
    { label: copy.registered, value: registered },
    { label: copy.votes, value: votes },
    {
      label: closed ? copy.didNotVote : copy.notVotedYet,
      value: formatNumber(turnout.notVoted),
    },
    { label: closed ? copy.finalTurnout : copy.turnout, value: formatPercent(turnout.ratio) },
  ];
}

/** "Stats" row: three cards with notes on A1 (42:2291), four without on A2 / A3 (42:2368, 42:2454). */
export function OverviewStats({ overview }: { overview: AdminOverview }) {
  const stats = statsFor(overview);
  return (
    <div
      className={cx(
        'grid gap-20',
        stats.length === 3 ? 'md:grid-cols-3' : 'grid-cols-2 xl:grid-cols-4',
      )}
    >
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
