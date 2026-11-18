'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { queryKeys } from '@/lib/query/keys';

/**
 * Follows the election state over /election/stream while `enabled` (a signed-in voter who has not
 * voted yet). Each event replaces the cached state. Returns true while the stream is open, so the
 * pages stop polling; when it drops they poll again and the state is fetched at once.
 */
export function useElectionStream(enabled: boolean): boolean {
  const queryClient = useQueryClient();
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void import('./electionStream').then(({ startElectionStream }) => {
      if (cancelled) return;
      stop = startElectionStream({
        onStreaming: (open) => {
          setStreaming(open);
          if (!open) void queryClient.invalidateQueries({ queryKey: queryKeys.election });
        },
        onEvent: (election) => {
          queryClient.setQueryData(queryKeys.election, election);
        },
      });
    });
    return () => {
      cancelled = true;
      stop?.();
      setStreaming(false);
    };
  }, [enabled, queryClient]);

  return enabled && streaming;
}
