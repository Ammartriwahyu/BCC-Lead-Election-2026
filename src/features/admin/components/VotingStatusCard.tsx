import { adminCopy } from '@/content/adminCopy';
import { content } from '@/content/copy';
import type { ElectionState } from '@/lib/api/types';
import { cx } from '@/lib/utils/cx';

const copy = adminCopy.overview.status;

const STEPS: readonly ElectionState[] = ['NOT_STARTED', 'OPEN', 'CLOSED'];

/**
 * "Voting status" card (42:2304): three steps, bars filled up to the current state, the current
 * one in brand colour with "Now". Read-only; the state changes only through the page actions.
 */
export function VotingStatusCard({ state }: { state: ElectionState }) {
  const currentIndex = STEPS.indexOf(state);
  return (
    <section
      aria-labelledby="voting-status-title"
      className="flex flex-col gap-20 rounded-xl border border-border-card bg-surface-card p-24"
    >
      <h2 id="voting-status-title" className="text-heading-6 text-text-primary">
        {copy.title}
      </h2>
      <ol className="flex flex-col gap-16 md:flex-row">
        {STEPS.map((step, index) => {
          const current = index === currentIndex;
          return (
            <li
              key={step}
              aria-current={current ? 'step' : undefined}
              className="flex min-w-0 flex-1 flex-col gap-8"
            >
              <span
                aria-hidden="true"
                className={cx(
                  'h-6 w-full rounded-full',
                  index <= currentIndex ? 'bg-action-primary' : 'bg-neutral-100',
                )}
              />
              <p className="flex items-center gap-8">
                <span
                  className={
                    current
                      ? 'text-body-1-semibold text-text-brand'
                      : 'text-body-1-medium text-text-primary'
                  }
                >
                  {content.election.badge[step]}
                </span>
                {current ? (
                  <span className="text-caption-semibold text-text-secondary">{copy.now}</span>
                ) : null}
              </p>
              <p className="text-body-2 text-text-secondary">{copy.steps[step]}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
