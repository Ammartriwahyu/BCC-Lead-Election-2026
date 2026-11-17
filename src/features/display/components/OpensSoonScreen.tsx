import { content } from '@/content/copy';
import { displayCopy } from '@/content/displayCopy';
import type { DisplayCandidate } from '@/lib/api/types';
import { formatCandidateNumber } from '@/lib/utils/format';

import { DisplayFrame } from './DisplayFrame';
import { DisplayPhoto } from './DisplayPhoto';

const copy = displayCopy.opensSoon;

/** D1 · Voting opens soon (44:2973): message block and the candidate lineup (number, name, photo; no votes). */
export function OpensSoonScreen({ candidates }: { candidates: DisplayCandidate[] }) {
  const lineup = [...candidates].sort((a, b) => a.number - b.number);
  return (
    <DisplayFrame brace={{ pose: 'hello', width: 380, className: 'top-571 left-1440' }}>
      <div className="flex flex-col gap-32">
        <p className="text-heading-3 text-orange-300">{copy.eyebrow}</p>
        <h1 className="text-display-l text-text-on-dark">{copy.title}</h1>
        <p className="w-1100 text-heading-3 text-primary-200">{copy.body}</p>
      </div>
      <section aria-labelledby="lineup-title" className="flex max-w-1300 flex-col gap-20">
        <h2 id="lineup-title" className="text-heading-5 text-text-on-dark-muted">
          {copy.lineup}
        </h2>
        <ul className="flex flex-wrap gap-x-40 gap-y-24">
          {lineup.map((candidate) => (
            <li key={candidate.number} className="flex items-center gap-20">
              <DisplayPhoto name={candidate.name} photoUrl={candidate.photoUrl} size={96} />
              <div className="flex max-w-260 flex-col">
                <p className="text-body-1-semibold text-orange-300">
                  {content.candidates.numberLabel(formatCandidateNumber(candidate.number))}
                </p>
                <p className="text-heading-5 text-text-on-dark">{candidate.name}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </DisplayFrame>
  );
}
