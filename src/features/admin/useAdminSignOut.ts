'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { ROUTES } from '@/config/constants';
import { markSessionEnding } from '@/features/auth/sessionEnding';
import { adminSignOut } from '@/lib/api/endpoints';

/**
 * Ends the committee session, drops every cached query (turnout, voter list, results) and
 * replaces the history entry so Back cannot show the panel again.
 */
export function useAdminSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    markSessionEnding();
    try {
      await adminSignOut();
    } catch {
      // The cookie may already be gone; signing out locally is still correct.
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    router.replace(`${ROUTES.adminSignIn}?reason=signed-out`);
  }, [queryClient, router, signingOut]);

  return { signOut, signingOut };
}
