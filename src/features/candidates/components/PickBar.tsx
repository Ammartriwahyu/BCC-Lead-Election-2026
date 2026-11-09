import { Button } from '@/components/ui/Button';
import { content } from '@/content/copy';
import type { Candidate } from '@/lib/api/types';
import { cx } from '@/lib/utils/cx';
import { formatCandidateNumber } from '@/lib/utils/format';

const copy = content.candidates;

interface PickBarProps {
  pick: Candidate | undefined;
  onReview: () => void;
  disabled: boolean;
}

/**
 * Desktop "Your pick" bar under the grid (V2, 39:1937 / 39:2059), from 768 px.
 * Empty: bg/subtle + card border, disabled button. Selected: white, 2px brand border, Shadow card.
 */
export function PickBar({ pick, onReview, disabled }: PickBarProps) {
  return (
    <div
      className={cx(
        'hidden items-center justify-between gap-16 rounded-xl px-24 py-20 md:flex',
        pick
          ? 'border-2 border-border-brand bg-surface-card shadow-card'
          : 'border border-border-card bg-bg-subtle',
      )}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-body-2-medium text-text-secondary">{copy.yourPick}</p>
        <p className="truncate text-body-1-semibold text-text-primary" aria-live="polite">
          {pick ? copy.pickSummary(pick.name, formatCandidateNumber(pick.number)) : copy.noPick}
        </p>
      </div>
      <Button onClick={onReview} disabled={!pick || disabled}>
        {copy.reviewAndSubmit}
      </Button>
    </div>
  );
}
