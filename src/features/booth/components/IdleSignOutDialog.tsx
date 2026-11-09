'use client';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { BOOTH } from '@/config/constants';
import { content } from '@/content/copy';
import { useVoterSignOut } from '@/features/auth/useVoterSignOut';

import { useCountdown } from '../useCountdown';
import { useIdleTimer } from '../useIdleTimer';

const copy = content.booth;

/**
 * NEW (not in Figma): booth idle timeout (spec §4.3). After 90 s without input a
 * "Still there?" dialog counts down 30 s, then signs the voter out.
 */
export function IdleSignOutDialog({ enabled }: { enabled: boolean }) {
  const { idle, reset } = useIdleTimer(enabled, BOOTH.idleTimeoutMs);
  const { signOut, signingOut } = useVoterSignOut();
  const remaining = useCountdown(BOOTH.idleCountdownSeconds, enabled && idle, () => {
    void signOut();
  });

  return (
    <Dialog
      open={enabled && idle}
      onOpenChange={(open) => {
        if (!open) reset();
      }}
      title={copy.idleTitle}
      description={<span aria-live="off">{copy.idleBody(remaining)}</span>}
      actions={
        <>
          <Button variant="secondary" loading={signingOut} onClick={() => void signOut()}>
            {copy.idleSignOut}
          </Button>
          <Button onClick={reset}>{copy.idleContinue}</Button>
        </>
      }
    />
  );
}
