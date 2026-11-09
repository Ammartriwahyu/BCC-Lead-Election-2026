import { Skeleton } from '@/components/ui/Skeleton';
import { content } from '@/content/copy';

const PLACEHOLDER_CARDS = 3;

/** NEW: loading placeholder shaped like the candidate grid. */
export function CandidateGridSkeleton() {
  return (
    <div role="status" className="grid gap-16 md:grid-cols-2 md:gap-24 lg:grid-cols-3 lg:gap-40">
      <span className="sr-only">{content.loading}</span>
      {Array.from({ length: PLACEHOLDER_CARDS }, (_, i) => (
        <Skeleton key={i} className="h-188 rounded-xl md:h-500" />
      ))}
    </div>
  );
}
