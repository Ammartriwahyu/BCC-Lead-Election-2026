import { TimeIcon } from '@/components/icons/TimeIcon';
import { content } from '@/content/copy';
import { formatDateWib, formatTimeWib } from '@/lib/utils/format';

/** V5 / V5b "Detail" row: brand time icon + "Submitted Nov 9, 2026 at 10:24 WIB". */
export function SubmittedAtDetail({ submittedAt }: { submittedAt: Date | null | undefined }) {
  if (!submittedAt) return null;
  return (
    <p className="flex items-center gap-8 text-body-2-medium text-text-primary">
      <TimeIcon size={20} className="shrink-0 text-text-brand" />
      <span>{content.submittedAt(formatDateWib(submittedAt), formatTimeWib(submittedAt))}</span>
    </p>
  );
}
