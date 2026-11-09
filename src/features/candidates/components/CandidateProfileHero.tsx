import type { ReactNode } from 'react';

import { ArrowLeftIcon } from '@/components/icons/ArrowLeftIcon';
import { Decoration } from '@/components/layout/Decoration';
import { content } from '@/content/copy';
import type { Candidate } from '@/lib/api/types';

import { candidateDetails, candidateNumberLabel } from '../candidateLabels';
import { CandidatePhoto } from './CandidatePhoto';

const copy = content.candidate;
const MOBILE_DECORATION_SCALE = 0.6;

interface CandidateProfileHeroProps {
  candidate: Candidate;
  onBack: () => void;
  /** Desktop action under the details: "Select this candidate" or the not-open note. */
  action: ReactNode;
  /** Mobile-only content under the profile (the not-open note on MV1). */
  mobileExtra?: ReactNode;
}

/**
 * Navy profile hero of V3 / V1 V&M (59:3485, photo 240×280 flush with the bottom edge)
 * and MV3 / MV1 V&M (photo 96×112, decoration at 60%).
 */
export function CandidateProfileHero({
  candidate,
  onBack,
  action,
  mobileExtra,
}: CandidateProfileHeroProps) {
  return (
    <section
      data-surface="dark"
      aria-labelledby="candidate-name"
      className="relative isolate flex flex-col items-start gap-20 overflow-hidden bg-bg-navy px-16 pt-16 pb-24 md:gap-32 md:page-gutter md:pt-40 md:pb-0"
    >
      <Decoration
        corner="top-right"
        scale={MOBILE_DECORATION_SCALE}
        className="absolute -top-44 -right-148 -z-10 md:hidden"
      />
      <Decoration corner="top-right" className="absolute -top-56 -right-112 -z-10 hidden lg:grid" />

      <button
        type="button"
        onClick={onBack}
        className="flex min-h-44 items-center gap-8 rounded-lg border border-slate-300 py-10 pr-16 pl-12 text-body-1-medium text-text-on-dark transition-colors hover:bg-primary-700 active:bg-primary-900"
      >
        <ArrowLeftIcon size={24} />
        <span className="md:hidden">{copy.backMobile}</span>
        <span className="hidden md:inline">{copy.back}</span>
      </button>

      <div className="flex w-full items-center gap-16 md:gap-40">
        <CandidatePhoto
          name={candidate.name}
          photoUrl={candidate.photoUrl}
          tone="hero"
          className="h-112 w-96 rounded-lg md:h-280 md:w-240 md:rounded-xl"
          iconClassName="size-36 md:size-48"
          showCaption
          sizes="(min-width: 768px) 240px, 96px"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-12">
          <p className="text-body-2-semibold text-orange-300 md:text-body-1-semibold">
            {candidateNumberLabel(candidate)}
          </p>
          <h1
            id="candidate-name"
            className="text-heading-5 break-words text-text-on-dark md:text-heading-2"
          >
            {candidate.name}
          </h1>
          <p className="text-body-2 text-text-on-dark-muted md:text-body-1">
            {candidateDetails(candidate)}
          </p>
          <div className="hidden pt-12 md:block">{action}</div>
        </div>
      </div>
      {mobileExtra ? <div className="w-full md:hidden">{mobileExtra}</div> : null}
    </section>
  );
}
