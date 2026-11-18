'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { STREAM } from '@/config/constants';
import { subscribeAdmin } from '@/lib/api/endpoints';
import type { AdminOverview } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';
import { createFallbackStream } from '@/lib/stream/fallbackStream';

import { AdminStreamContext, overviewChanges } from '../adminStream';

/**
 * Opens /admin/stream once for the whole committee panel. Each `overview` event replaces the
 * cached overview; a new vote (or a state change) refreshes the voter list and the live results
 * once, a new or removed candidate refreshes the candidate list. While the stream is down the
 * queries poll as before, and the overview is fetched at once so nothing is missed.
 */
export function AdminStreamProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    const stream = createFallbackStream(
      { subscribe: subscribeAdmin, retryMs: STREAM.retryMs },
      {
        onStreaming: (open) => {
          setStreaming(open);
          if (!open) void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview });
        },
        onEvent: (next) => {
          const previous = queryClient.getQueryData<AdminOverview>(queryKeys.admin.overview);
          queryClient.setQueryData(queryKeys.admin.overview, next);
          const changed = overviewChanges(previous, next);
          if (changed.votes) {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'voters'] });
            void queryClient.invalidateQueries({ queryKey: queryKeys.admin.results });
          }
          if (changed.candidates) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.admin.candidates });
          }
        },
      },
    );
    stream.start();
    return () => {
      stream.stop();
    };
  }, [queryClient]);

  return <AdminStreamContext value={streaming}>{children}</AdminStreamContext>;
}
