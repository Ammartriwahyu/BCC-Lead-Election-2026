import { QueryClient } from '@tanstack/react-query';

import { QUERY } from '@/config/constants';
import { isApiError } from '@/lib/api/errors';

/** Retry only transient failures; 4xx answers are final. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!isApiError(error)) return failureCount < QUERY.maxRetries;
  return error.isTransient && failureCount < QUERY.maxRetries;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY.defaultStaleMs,
        gcTime: QUERY.gcMs,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: false,
      },
      mutations: {
        // Mutations are never retried automatically: vote retry is an explicit, idempotent user action.
        retry: false,
      },
    },
  });
}
