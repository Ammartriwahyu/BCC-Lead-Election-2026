'use client';

import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { ROUTES } from '@/config/constants';
import { content } from '@/content/copy';
import type { Candidate } from '@/lib/api/types';
import { cx } from '@/lib/utils/cx';

import { candidateDetails, candidateNumberLabel } from '../candidateLabels';
import { CandidatePhoto } from './CandidatePhoto';

export type CandidateCardStatus = 'locked' | 'default' | 'selected';

interface CandidateCardProps {
  candidate: Candidate;
  status: CandidateCardStatus;
  onToggle: () => void;
  onOpenDetails: () => void;
  /** Committee form preview (A7/A8): same card, buttons shown but not usable. */
  preview?: boolean;
  /** Preview only: the details line while study program / year are not chosen yet. */
  details?: string;
}

const copy = content.candidates;

/**
 * Figma "Pilketum / Candidate card" (37:898, 400 wide) from 768 px and
 * "… mobile" (78:3262, compact row) below. Locked = voting not open, no Select.
 * Selected: bg/subtle, 2px brand border; pressing "Selected" clears the pick.
 */
export function CandidateCard({
  candidate,
  status,
  onToggle,
  onOpenDetails,
  preview = false,
  details,
}: CandidateCardProps) {
  const selected = status === 'selected';
  return (
    <article
      aria-labelledby={`candidate-${candidate.id}-name`}
      data-testid="candidate-card"
      data-status={status}
      inert={preview}
      className={cx(
        'flex motion-lift flex-col gap-16 rounded-xl p-16 shadow-card md:pb-20',
        selected
          ? 'border-2 border-border-brand bg-bg-subtle'
          : 'border border-border-card bg-surface-card',
      )}
    >
      <div className="flex items-center gap-16 md:flex-col md:items-stretch">
        <CandidatePhoto
          name={candidate.name}
          photoUrl={candidate.photoUrl}
          tone={selected ? 'card-selected' : 'card'}
          className="h-104 w-88 rounded-lg md:h-300 md:w-full"
          iconClassName="size-32 md:size-48"
          showCaption={false}
          sizes="(min-width: 768px) 400px, 88px"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-4 md:px-4">
          <p className="text-body-2-semibold text-text-brand">{candidateNumberLabel(candidate)}</p>
          <h3
            id={`candidate-${candidate.id}-name`}
            className="text-heading-6 break-words text-text-primary md:text-heading-5"
          >
            {candidate.name}
          </h3>
          <p className="text-body-2 text-text-secondary">
            {details ?? candidateDetails(candidate)}
          </p>
        </div>
      </div>
      <div className="flex gap-12 *:min-w-0 *:flex-1">
        <ButtonLink
          href={ROUTES.candidate(candidate.id)}
          variant="secondary"
          aria-label={copy.visionMissionFor(candidate.name)}
          onClick={onOpenDetails}
        >
          {copy.visionMission}
        </ButtonLink>
        {status === 'locked' ? null : (
          <Button
            variant={selected ? 'dark' : 'primary'}
            aria-pressed={selected}
            aria-label={
              selected ? copy.selectedFor(candidate.name) : copy.selectFor(candidate.name)
            }
            onClick={onToggle}
          >
            {selected ? copy.selected : copy.select}
          </Button>
        )}
      </div>
    </article>
  );
}
