import { LockIcon } from '@/components/icons/LockIcon';
import { Badge } from '@/components/ui/Badge';
import { displayCopy } from '@/content/displayCopy';
import type { Turnout } from '@/lib/api/types';
import { formatNumber, formatPercent } from '@/lib/utils/format';

import { DisplayFrame } from './DisplayFrame';

const copy = displayCopy.votingOpen;
const PERCENT = 100;

/** D2 · Voting open (44:3062): live turnout only. Candidate totals are never part of this payload. */
export function VotingOpenScreen({ turnout }: { turnout: Turnout }) {
  return (
    <DisplayFrame brace={{ pose: 'woah', width: 360, className: 'top-506 left-1460' }}>
      <div className="flex flex-col gap-24">
        <div className="flex items-center gap-16">
          <Badge tone="success">{copy.badge}</Badge>
          <p className="text-heading-5 text-text-on-dark">{copy.lead}</p>
        </div>
        <h1 className="flex items-baseline gap-32">
          <span className="text-display-xl text-text-on-dark tabular-nums">
            {formatPercent(turnout.ratio)}
          </span>
          <span className="text-heading-3 text-primary-200">{copy.turnout}</span>
        </h1>
        <p className="text-heading-3 text-text-on-dark tabular-nums">
          {copy.summary(
            formatNumber(turnout.votesReceived),
            formatNumber(turnout.registeredVoters),
          )}
        </p>
        <div aria-hidden="true" className="h-24 w-1100 overflow-hidden rounded-full bg-primary-700">
          <div
            data-testid="turnout-fill"
            className="h-full rounded-full bg-orange-300 transition-[width] duration-700"
            style={{ width: `${turnout.ratio * PERCENT}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-16 text-primary-200">
        <LockIcon size={32} />
        <p className="text-heading-6">{copy.note}</p>
      </div>
    </DisplayFrame>
  );
}
