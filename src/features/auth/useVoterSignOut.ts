'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { ROUTES } from '@/config/constants';
import { voterSignOut } from '@/lib/api/endpoints';

import { markSessionEnding } from './sessionEnding';

export type SignOutReason = 'expired' | 'signed-out';

/**
 * Booth-safe sign-out: end the server session, drop every cached query and replace the
 * history entry so Back cannot show the previous voter's data (spec §4.3).
 * In-memory voting state is dropped when the session layout unmounts.
 */
export function useVoterSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(
    async (reason: SignOutReason = 'signed-out') => {
      if (signingOut) return;
      setSigningOut(true);
      markSessionEnding();
      try {
        await voterSignOut();
      } catch {
        // The cookie may already be gone; signing out locally is still correct.
      }
      await queryClient.cancelQueries();
      queryClient.clear();
      router.replace(`${ROUTES.signIn}?reason=${reason}`);
    },
    [queryClient, router, signingOut],
  );

  return { signOut, signingOut };
}
