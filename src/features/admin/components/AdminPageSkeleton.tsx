import { Skeleton } from '@/components/ui/Skeleton';
import { commonCopy } from '@/content/commonCopy';

/** NEW (not in Figma): placeholder while a committee page loads its first data. */
export function AdminPageSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-32">
      <span className="sr-only">{commonCopy.loading}</span>
      <div className="flex flex-col gap-8">
        <Skeleton className="h-48 w-255" />
        <Skeleton className="h-24 w-full max-w-520" />
      </div>
      <Skeleton className="h-112 w-full rounded-xl" />
      <Skeleton className="h-255 w-full rounded-xl" />
    </div>
  );
}
