import { MeterBar } from '@/components/ui/MeterBar';
import { adminCopy } from '@/content/adminCopy';
import type { Turnout } from '@/lib/api/types';
import { formatNumber } from '@/lib/utils/format';

const copy = adminCopy.overview.turnout;

/** A2 "Turnout" card (42:2385): live bar while voting is open. Turnout only, never candidate totals. */
export function TurnoutCard({ turnout }: { turnout: Turnout }) {
  return (
    <section
      aria-labelledby="turnout-title"
      className="flex flex-col gap-12 rounded-xl border border-border-card bg-surface-card p-24"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-16 gap-y-4">
        <h2 id="turnout-title" className="text-heading-6 text-text-primary">
          {copy.title}
        </h2>
        <p className="text-body-1-medium text-text-secondary tabular-nums">
          {copy.summary(
            formatNumber(turnout.votesReceived),
            formatNumber(turnout.registeredVoters),
          )}
        </p>
      </div>
      <MeterBar ratio={turnout.ratio} size="lg" />
      <p className="text-body-2 text-text-secondary">{copy.note}</p>
    </section>
  );
}
