import { content } from '@/content/copy';
import { displayCopy } from '@/content/displayCopy';
import type { Turnout } from '@/lib/api/types';
import { formatCandidateNumber, formatNumber } from '@/lib/utils/format';

import { DisplayFrame } from './DisplayFrame';

const copy = displayCopy.winnerReveal;

interface WinnerRevealScreenProps {
  turnout: Turnout;
  /** Numbers only: this screen must not hint at the result. */
  candidateNumbers: number[];
}

/** D6 · The winner is… (51:3387): suspense screen, every candidate hidden behind a "?". */
export function WinnerRevealScreen({ turnout, candidateNumbers }: WinnerRevealScreenProps) {
  return (
    <DisplayFrame brace={{ pose: 'woah', width: 300, className: 'top-666 left-1520' }}>
      <div className="flex flex-col items-center gap-48">
        <h1 className="text-center text-display-l text-text-on-dark">{copy.title}</h1>
        <ul className="flex flex-wrap justify-center gap-64">
          {candidateNumbers.map((number) => (
            <li key={number} className="flex flex-col items-center gap-16">
              <span
                aria-hidden="true"
                className="flex size-220 items-center justify-center rounded-full bg-primary-700 text-display-l text-primary-300"
              >
                {copy.hidden}
              </span>
              <span className="text-heading-5 text-primary-200">
                {content.candidates.numberLabel(formatCandidateNumber(number))}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-heading-5 text-text-on-dark-muted">
        {copy.counted(turnout.votesReceived, formatNumber(turnout.votesReceived))}
      </p>
    </DisplayFrame>
  );
}
