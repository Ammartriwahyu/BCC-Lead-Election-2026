import { TimeIcon } from '@/components/icons/TimeIcon';
import { content } from '@/content/copy';

/** "Not open note" (40:2200): warning-bg pill shown instead of "Select this candidate" before voting opens. */
export function NotOpenNote() {
  return (
    <p className="flex items-center gap-12 rounded-lg bg-status-warning-bg px-16 py-12 text-body-2-medium text-orange-700">
      <TimeIcon size={20} className="shrink-0" />
      <span>{content.candidate.notOpenNote}</span>
    </p>
  );
}
