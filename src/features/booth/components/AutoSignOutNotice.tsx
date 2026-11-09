'use client';

import { BOOTH } from '@/config/constants';
import { publicEnv } from '@/config/env';
import { content } from '@/content/copy';
import { useVoterSignOut } from '@/features/auth/useVoterSignOut';

import { useCountdown } from '../useCountdown';

/**
 * NEW (not in Figma): "Signing you out in 10s" under the Sign out button on V5 / V5b
 * in booth mode, then signs out (spec §4.3). Silent for screen readers (role="timer").
 */
export function AutoSignOutNotice() {
  const { signOut } = useVoterSignOut();
  const enabled = publicEnv.boothMode;
  const remaining = useCountdown(BOOTH.autoSignOutSeconds, enabled, () => {
    void signOut();
  });
  if (!enabled) return null;
  return (
    <p
      role="timer"
      aria-live="off"
      className="text-caption text-text-secondary"
      data-testid="auto-sign-out"
    >
      {content.booth.autoSignOut(remaining)}
    </p>
  );
}
