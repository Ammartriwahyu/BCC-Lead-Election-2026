'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ROUTES } from '@/config/constants';
import { onUnauthorized } from '@/lib/api/client';

import { isSessionEnding, markSessionEnding } from '../sessionEnding';

/** Any 401 on a voter page: clear every cache and go to sign-in with a short message (spec §4.2). */
export function SessionExpiryListener() {
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
        router.replace(`${ROUTES.signIn}?reason=expired&next=${next}`);
      }),
    [pathname, queryClient, router],
  );

  return null;
}
