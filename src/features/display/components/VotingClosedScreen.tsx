import { displayCopy } from '@/content/displayCopy';
import type { Turnout } from '@/lib/api/types';
import { formatNumber, formatPercent } from '@/lib/utils/format';

import { DisplayFrame } from './DisplayFrame';
import { DisplayTotals } from './DisplayTotals';

const copy = displayCopy.votingClosed;

/** D5 · Voting closed (51:3320): shown automatically when voting closes. Turnout only. */
export function VotingClosedScreen({ turnout }: { turnout: Turnout }) {
  return (
    <DisplayFrame brace={{ pose: 'hello', width: 340, className: 'top-642 left-1480' }}>
      <div className="flex flex-col gap-32">
        <p className="text-heading-4 text-orange-300">{copy.eyebrow}</p>
        <h1 className="text-display-l text-text-on-dark">{copy.title}</h1>
        <p className="w-1100 text-heading-3 text-primary-200">{copy.body}</p>
      </div>
      <DisplayTotals
        totals={[
          { value: formatNumber(turnout.votesReceived), label: copy.membersVoted },
          { value: formatNumber(turnout.registeredVoters), label: copy.registered },
          { value: formatPercent(turnout.ratio), label: copy.turnout },
        ]}
      />
    </DisplayFrame>
  );
}
