import { MeterBar } from '@/components/ui/MeterBar';
import { adminCopy } from '@/content/adminCopy';
import { commonCopy } from '@/content/commonCopy';
import type { CandidateTally } from '@/lib/api/types';
import { cx } from '@/lib/utils/cx';
import { formatCandidateNumber, formatNumber, formatPercent } from '@/lib/utils/format';

const copy = adminCopy.results;

interface ResultRowProps {
  tally: CandidateTally;
  /** Has the top vote count (alone or tied). Never true with zero votes. */
  leading: boolean;
  /** More than one candidate shares the top count. */
  tied: boolean;
}

/**
 * Figma "Pilketum / Result row" (37:1126): Rank=Leading has the 2px brand border, brand bar and
 * brand share; Rank=Other the card border, primary/300 bar and primary text.
 */
export function ResultRow({ tally, leading, tied }: ResultRowProps) {
  return (
    <li
      data-leading={leading || undefined}
      className={cx(
        'flex flex-wrap items-center gap-x-24 gap-y-12 rounded-xl bg-surface-card px-24 py-20',
        leading ? 'border-2 border-border-brand' : 'border border-border-card',
      )}
    >
      <div className="flex w-full min-w-0 flex-col gap-4 md:w-300">
        <p className="text-body-2-semibold text-text-brand">
          {commonCopy.candidateNumber(formatCandidateNumber(tally.number))}
          {leading ? (
            <span className="sr-only">{`, ${tied ? copy.tied : copy.leading}`}</span>
          ) : null}
        </p>
        <p className="text-heading-6 wrap-anywhere text-text-primary">{tally.name}</p>
      </div>
      <div className="flex min-w-160 flex-1 flex-col gap-8">
        <MeterBar ratio={tally.share} tone={leading ? 'strong' : 'soft'} />
        <p className="text-body-2-medium text-text-secondary tabular-nums">
          {copy.votes(tally.votes, formatNumber(tally.votes))}
        </p>
      </div>
      <p
        className={cx(
          'w-120 text-right text-heading-4 tabular-nums',
          leading ? 'text-text-brand' : 'text-text-primary',
        )}
      >
        {formatPercent(tally.share)}
      </p>
    </li>
  );
}
