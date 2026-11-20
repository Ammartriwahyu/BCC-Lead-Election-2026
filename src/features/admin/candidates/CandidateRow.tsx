import { PersonIcon } from '@/components/icons/PersonIcon';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { CandidateImage } from '@/components/ui/CandidateImage';
import { ROUTES } from '@/config/constants';
import { candidatesCopy } from '@/content/candidatesCopy';
import { commonCopy } from '@/content/commonCopy';
import type { Candidate } from '@/lib/api/types';

import { isCandidateComplete } from './openVoting';

const copy = candidatesCopy;

interface CandidateRowProps {
  candidate: Candidate;
  /** Shows Edit (only before voting has opened). */
  editable: boolean;
}

/**
 * Figma "Pilketum / Candidate row" (149:3882): ballot number, photo, name, "Prodi · Class of",
 * one line of vision, completeness and mission count, Edit while editable (Locked otherwise).
 */
export function CandidateRow({ candidate, editable }: CandidateRowProps) {
  const number = String(candidate.number).padStart(2, '0');
  const complete = isCandidateComplete(candidate);
  return (
    <li className="flex flex-wrap items-center gap-x-20 gap-y-12 rounded-xl border border-border-card bg-surface-card py-16 pr-20 pl-16 shadow-card md:flex-nowrap">
      <span className="flex size-56 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-heading-5 text-text-brand">
        <span className="sr-only">{copy.ballot(number)}</span>
        <span aria-hidden="true">{number}</span>
      </span>
      <span className="relative flex h-80 w-64 shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-subtle">
        {candidate.photoUrl ? (
          <CandidateImage
            src={candidate.photoUrl}
            alt={commonCopy.candidatePhotoAlt(candidate.name)}
            sizes="64px"
          />
        ) : (
          <PersonIcon size={28} className="text-primary-300" />
        )}
      </span>
      <div className="flex min-w-0 flex-1 basis-160 flex-col gap-4">
        <h2 className="text-heading-6 wrap-anywhere text-text-primary">{candidate.name}</h2>
        <p className="text-body-2 wrap-anywhere text-text-secondary">
          {copy.details(candidate.major, candidate.classYear)}
        </p>
        <p data-truncate className="truncate text-body-2 text-text-primary">
          {copy.visionPreview(candidate.vision)}
        </p>
      </div>
      <div className="ml-auto flex shrink-0 flex-col items-end gap-8">
        <Badge tone={complete ? 'success' : 'warning'}>
          {complete ? copy.complete : copy.incomplete}
        </Badge>
        <p className="text-body-2 whitespace-nowrap text-text-secondary">
          {copy.missionCount(candidate.missions.length)}
        </p>
      </div>
      {editable ? (
        <ButtonLink
          href={ROUTES.adminCandidateEdit(candidate.id)}
          variant="secondary"
          aria-label={copy.editFor(candidate.name)}
          className="shrink-0"
        >
          {copy.edit}
        </ButtonLink>
      ) : null}
    </li>
  );
}
