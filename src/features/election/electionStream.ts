/**
 * Loaded on demand by useElectionStream (kept out of the first-load JS of the voter pages): opens
 * /election/stream with polling as the fallback.
 */
import { STREAM } from '@/config/constants';
import { subscribeElection } from '@/lib/api/endpoints';
import type { Election } from '@/lib/api/types';
import { createFallbackStream, type FallbackStreamCallbacks } from '@/lib/stream/fallbackStream';

/** Starts the stream and returns the function that stops it. */
export function startElectionStream(callbacks: FallbackStreamCallbacks<Election>): () => void {
  const stream = createFallbackStream(
    { subscribe: subscribeElection, retryMs: STREAM.retryMs },
    callbacks,
  );
  stream.start();
  return stream.stop;
}
