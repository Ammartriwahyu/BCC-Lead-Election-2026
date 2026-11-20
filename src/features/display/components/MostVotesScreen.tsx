import { PersonIcon } from '@/components/icons/PersonIcon';
import { CandidateImage } from '@/components/ui/CandidateImage';
import { content } from '@/content/copy';
import { displayCopy } from '@/content/displayCopy';
import type { CandidateTally, ResultsSummary } from '@/lib/api/types';
import { formatCandidateNumber, formatNumber, formatPercent } from '@/lib/utils/format';

import { DisplayFrame, type BracePlacement } from './DisplayFrame';
import { DisplayPhoto } from './DisplayPhoto';

const copy = displayCopy.mostVotes;
/** Figma D4 puts Brace over the spotlight photo; without that photo it moves to the D3 corner. */
const BRACE_ON_PHOTO: BracePlacement = { pose: 'glory', width: 280, className: 'top-668 left-40' };
const BRACE_IN_CORNER: BracePlacement = {
  pose: 'glory',
  width: 260,
  className: 'top-754 left-1600',
};

function details(tally: CandidateTally): string {
  return copy.details(formatCandidateNumber(tally.number), tally.major, tally.classYear);
}

/** "Candidate photo" of D4 (44:3272): 520 × 640 arch in orange/300 (top radius = half the width). */
function SpotlightPhoto({ tally }: { tally: CandidateTally }) {
  return (
    <div className="relative flex h-640 w-520 shrink-0 flex-col items-center justify-center gap-12 overflow-hidden rounded-t-[260px] rounded-b-xl bg-orange-300 text-primary-800">
      {tally.photoUrl ? (
        <CandidateImage
          src={tally.photoUrl}
          alt={content.candidates.photoAlt(tally.name)}
          sizes="520px"
        />
      ) : (
        <>
          <PersonIcon size={96} />
          <span className="text-heading-6">{content.candidates.photo}</span>
        </>
      )}
    </div>
  );
}

function Numbers({ tally, validVotes }: { tally: CandidateTally; validVotes: number }) {
  return (
    <dl className="flex gap-64 pt-16">
      <div className="flex flex-col-reverse">
        <dt className="text-heading-6 text-primary-200">{copy.votes(tally.votes)}</dt>
        <dd className="text-heading-1 text-text-on-dark tabular-nums">
          {formatNumber(tally.votes)}
        </dd>
      </div>
      <div className="flex flex-col-reverse">
        <dt className="text-heading-6 text-primary-200">
          {copy.ofVotes(validVotes, formatNumber(validVotes))}
        </dt>
        <dd className="text-heading-1 text-text-on-dark tabular-nums">
          {formatPercent(tally.share)}
        </dd>
      </div>
    </dl>
  );
}

/** One leader: D4 spotlight as designed. */
function Spotlight({ tally, validVotes }: { tally: CandidateTally; validVotes: number }) {
  return (
    <div className="flex items-center gap-80">
      <SpotlightPhoto tally={tally} />
      <div className="flex min-w-0 flex-1 flex-col gap-24">
        <p className="text-heading-4 text-orange-300">{copy.label}</p>
        <h1 className="text-display wrap-anywhere text-text-on-dark">{tally.name}</h1>
        <p className="text-heading-5 text-primary-200">{details(tally)}</p>
        <Numbers tally={tally} validVotes={validVotes} />
      </div>
    </div>
  );
}

/** NEW: two or more candidates share the top count. No single name is put forward. */
function TiedLeaders({ leaders, validVotes }: { leaders: CandidateTally[]; validVotes: number }) {
  return (
    <div className="flex flex-col gap-40">
      <h1 className="text-heading-2 text-orange-300">{copy.tiedLabel}</h1>
      <ul className="flex motion-stagger flex-wrap gap-x-48 gap-y-40">
        {leaders.map((tally) => (
          <li key={tally.candidateId} className="flex w-720 items-center gap-32">
            <DisplayPhoto name={tally.name} photoUrl={tally.photoUrl} size={160} tone="highlight" />
            <div className="flex min-w-0 flex-col gap-8">
              <p className="text-heading-2 wrap-anywhere text-text-on-dark">{tally.name}</p>
              <p className="text-heading-6 text-primary-200">{details(tally)}</p>
              <Numbers tally={tally} validVotes={validVotes} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** D4 · Most votes (44:3222), with a tie variant and a zero-votes variant (NEW). */
export function MostVotesScreen({ results }: { results: ResultsSummary }) {
  const [leader] = results.leaders;
  let body;
  if (!leader) {
    body = (
      <div className="flex flex-col gap-24">
        <p className="text-heading-4 text-orange-300">{copy.label}</p>
        <h1 className="text-display-l text-text-on-dark">{copy.noVotes}</h1>
      </div>
    );
  } else if (results.isTie) {
    body = <TiedLeaders leaders={results.leaders} validVotes={results.validVotes} />;
  } else {
    body = <Spotlight tally={leader} validVotes={results.validVotes} />;
  }

  return (
    <DisplayFrame brace={leader && !results.isTie ? BRACE_ON_PHOTO : BRACE_IN_CORNER}>
      {body}
      <p className="text-heading-5 text-text-on-dark-muted">
        {results.isTie ? copy.tieNote : copy.thanks}
      </p>
    </DisplayFrame>
  );
}
