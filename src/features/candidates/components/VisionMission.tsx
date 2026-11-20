import { content } from '@/content/copy';
import type { Candidate } from '@/lib/api/types';
import { formatCandidateNumber } from '@/lib/utils/format';

const copy = content.candidate;

function SectionLabel({ id, children }: { id: string; children: string }) {
  return (
    <div className="flex shrink-0 flex-col gap-8 lg:w-240">
      <span aria-hidden="true" className="h-4 w-40 rounded-full bg-orange-300 md:w-48" />
      <h2 id={id} className="text-heading-5 text-text-primary md:text-heading-4">
        {children}
      </h2>
    </div>
  );
}

/**
 * Vision quote and numbered mission cards (V3 Main 40:2038 / MV3 81:3563).
 * Labels sit beside the content from 1024 px, above it below that. Any number of missions.
 */
export function VisionMission({ candidate }: { candidate: Candidate }) {
  return (
    <div className="flex flex-col gap-32 px-16 pt-24 pb-32 md:page-gutter md:pt-64 md:pb-80">
      <section
        aria-labelledby="vision-title"
        className="flex flex-col gap-16 lg:flex-row lg:gap-48"
      >
        <SectionLabel id="vision-title">{copy.vision}</SectionLabel>
        <blockquote className="flex flex-1 flex-col gap-4 rounded-xl bg-bg-subtle px-20 pt-20 pb-24 md:flex-row md:gap-24 md:py-32 md:pr-40 md:pl-32">
          <span aria-hidden="true" className="text-heading-2 text-primary-300 md:text-display">
            “
          </span>
          <p className="text-heading-6 text-text-primary md:text-heading-4">{candidate.vision}</p>
        </blockquote>
      </section>

      <section
        aria-labelledby="mission-title"
        className="flex flex-col gap-16 lg:flex-row lg:gap-48"
      >
        <SectionLabel id="mission-title">{copy.mission}</SectionLabel>
        <ol className="grid flex-1 gap-16 lg:grid-cols-3 lg:gap-24">
          {candidate.missions.map((mission, index) => (
            <li
              // Two points may read the same: the position keeps the keys unique.
              key={`${String(index)}-${mission}`}
              className="flex gap-16 rounded-xl border border-border-card bg-surface-card p-16 shadow-card lg:min-h-196 lg:flex-col lg:p-24"
            >
              <span aria-hidden="true" className="text-heading-4 text-text-brand lg:text-heading-2">
                {formatCandidateNumber(index + 1)}
              </span>
              <p className="flex-1 text-body-1 text-text-primary">{mission}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
