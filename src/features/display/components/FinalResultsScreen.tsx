import { Badge } from '@/components/ui/Badge';
import { displayCopy } from '@/content/displayCopy';
import type { CandidateTally, ResultsSummary, Turnout } from '@/lib/api/types';
import { cx } from '@/lib/utils/cx';
import { formatNumber, formatPercent } from '@/lib/utils/format';

import { leaderIds, podiumBarHeight, podiumOrder, rankedBarRatio, resultsLayout } from '../results';
import { DisplayFrame } from './DisplayFrame';
import { DisplayPhoto } from './DisplayPhoto';
import { DisplayTotals } from './DisplayTotals';

const copy = displayCopy.finalResults;
const PERCENT = 100;

interface ColumnProps {
  tally: CandidateTally;
  leading: boolean;
  tied: boolean;
  topShare: number;
}

function LeaderNote({ leading, tied }: { leading: boolean; tied: boolean }) {
  if (!leading) return null;
  return <span className="sr-only">{`, ${tied ? copy.tied : copy.leading}`}</span>;
}

/** "Column / Candidate 0x" (44:3181): photo, name, votes, bar with the share. */
function PodiumColumn({ tally, leading, tied, topShare }: ColumnProps) {
  return (
    <li data-leading={leading || undefined} className="flex w-340 flex-col items-center gap-16">
      <DisplayPhoto
        name={tally.name}
        photoUrl={tally.photoUrl}
        size={leading ? 128 : 104}
        tone={leading ? 'highlight' : 'default'}
      />
      <p className="text-center text-heading-5 wrap-anywhere text-text-on-dark">
        {tally.name}
        <LeaderNote leading={leading} tied={tied} />
      </p>
      <p className="flex items-baseline gap-12">
        <span className="text-heading-1 text-text-on-dark tabular-nums">
          {formatNumber(tally.votes)}
        </span>
        <span className="text-heading-6 text-primary-200">{copy.votes(tally.votes)}</span>
      </p>
      <div
        data-testid="podium-bar"
        className={cx(
          'flex w-full animate-reveal-up justify-center rounded-t-xl p-24 motion-follow',
          leading ? 'bg-orange-300 text-primary-800' : 'bg-primary-600 text-text-on-dark',
        )}
        style={{ height: podiumBarHeight(tally.share, topShare) }}
      >
        <span className="text-heading-3 tabular-nums">{formatPercent(tally.share)}</span>
      </div>
    </li>
  );
}

/** NEW: more than three candidates. Same colours as the podium, one bar per row, ranked. */
function RankedRow({ tally, leading, tied, topShare }: ColumnProps) {
  return (
    <li data-leading={leading || undefined} className="flex items-center gap-24">
      <DisplayPhoto
        name={tally.name}
        photoUrl={tally.photoUrl}
        size={72}
        tone={leading ? 'highlight' : 'default'}
      />
      <div className="flex w-420 shrink-0 flex-col">
        <p className="text-heading-5 wrap-anywhere text-text-on-dark">
          {tally.name}
          <LeaderNote leading={leading} tied={tied} />
        </p>
        <p className="text-heading-6 text-primary-200 tabular-nums">
          {`${formatNumber(tally.votes)} ${copy.votes(tally.votes)}`}
        </p>
      </div>
      <div aria-hidden="true" className="h-56 flex-1 overflow-hidden rounded-r-xl bg-primary-700">
        <div
          className={cx(
            'h-full animate-reveal-right rounded-r-xl motion-follow',
            leading ? 'bg-orange-300' : 'bg-primary-600',
          )}
          style={{ width: `${rankedBarRatio(tally.share, topShare) * PERCENT}%` }}
        />
      </div>
      <p className="w-160 text-right text-heading-3 text-text-on-dark tabular-nums">
        {formatPercent(tally.share)}
      </p>
    </li>
  );
}

interface FinalResultsScreenProps {
  turnout: Turnout;
  results: ResultsSummary;
}

/**
 * D3 · Final results (44:3127): podium for up to three candidates (second, first, third), a ranked
 * bar list for more. Every candidate tied on the top count gets the leading colour. With zero votes
 * there is no ranking, so the columns keep candidate-number order.
 */
export function FinalResultsScreen({ turnout, results }: FinalResultsScreenProps) {
  const leaders = leaderIds(results);
  const topShare = results.candidates[0]?.share ?? 0;
  const layout = resultsLayout(results.candidates);
  const itemProps = (tally: CandidateTally) => ({
    tally,
    leading: leaders.has(tally.candidateId),
    tied: results.isTie,
    topShare,
  });

  return (
    <DisplayFrame
      layout="stack"
      brace={{ pose: 'glory', width: 260, className: 'top-754 left-1600' }}
    >
      <div className="flex items-center gap-24">
        <h1 className="text-heading-1 text-text-on-dark">{copy.title}</h1>
        <Badge tone="neutral">{copy.badge}</Badge>
      </div>
      {layout === 'podium' ? (
        <ol className="flex flex-1 motion-stagger items-end justify-center gap-40">
          {(results.validVotes === 0 ? results.candidates : podiumOrder(results.candidates)).map(
            (tally) => (
              <PodiumColumn key={tally.candidateId} {...itemProps(tally)} />
            ),
          )}
        </ol>
      ) : (
        <ol className="flex flex-1 motion-stagger flex-col justify-center gap-24 pr-260">
          {results.candidates.map((tally) => (
            <RankedRow key={tally.candidateId} {...itemProps(tally)} />
          ))}
        </ol>
      )}
      <DisplayTotals
        totals={[
          { value: formatNumber(results.validVotes), label: copy.votes(results.validVotes) },
          { value: formatNumber(turnout.registeredVoters), label: copy.registeredMembers },
          { value: formatPercent(turnout.ratio), label: copy.turnout },
        ]}
      />
    </DisplayFrame>
  );
}
