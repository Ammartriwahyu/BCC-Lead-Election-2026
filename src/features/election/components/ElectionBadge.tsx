import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { content } from '@/content/copy';
import type { ElectionState } from '@/lib/api/types';

/** Figma: Not started = Warning, Open = Success, Closed = Neutral (V0a–c, V1, A1–A3). */
const TONES: Record<ElectionState, BadgeTone> = {
  NOT_STARTED: 'warning',
  OPEN: 'success',
  CLOSED: 'neutral',
};

export function ElectionBadge({ state, className }: { state: ElectionState; className?: string }) {
  return (
    <Badge tone={TONES[state]} {...(className ? { className } : {})}>
      {content.election.badge[state]}
    </Badge>
  );
}
