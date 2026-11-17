'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ROUTES } from '@/config/constants';
import { onUnauthorized } from '@/lib/api/endpoints';

import { isSessionEnding, markSessionEnding } from '../sessionEnding';

interface SessionExpiryListenerProps {
  /** Where an expired session lands: voter sign-in by default, committee sign-in in the panel. */
  signInRoute?: typeof ROUTES.signIn | typeof ROUTES.adminSignIn;
}

/** Any 401 on a signed-in page: clear every cache and go to sign-in with a short message (spec §4.2). */
export function SessionExpiryListener({ signInRoute = ROUTES.signIn }: SessionExpiryListenerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(
    () =>
      onUnauthorized(() => {
        if (isSessionEnding()) return;
        markSessionEnding();
        void queryClient.cancelQueries();
        queryClient.clear();
        const next = encodeURIComponent(pathname);
        router.replace(`${signInRoute}?reason=expired&next=${next}`);
      }),
    [pathname, queryClient, router, signInRoute],
  );

  return null;
}
