/**
 * The committee's live connection (/admin/stream), framework-agnostic so it can be tested with
 * fake timers. Same idea as the display feed:
 *
 * 1. Stream first (SSE). While it is open, the panel stops polling (`streaming` = true) and every
 *    `overview` event updates the page.
 * 2. If the stream cannot be opened at all (no EventSource, 401, a backend without it), the panel
 *    keeps polling and does not try again.
 * 3. If a stream that worked drops, polling resumes at once and the stream is tried again after
 *    ADMIN.streamRetryMs.
 */
import { createContext } from 'react';

import { ADMIN } from '@/config/constants';
import type { AdminSubscription, EventStreamHandle } from '@/lib/api/endpoints';
import type { AdminOverview } from '@/lib/api/types';

/** True while /admin/stream is open: the admin queries stop polling. Default: poll. */
export const AdminStreamContext = createContext(false);

export interface AdminStreamDeps {
  subscribe: (handlers: AdminSubscription) => EventStreamHandle | null;
}

export interface AdminStreamCallbacks {
  /** The stream opened (true) or is down (false). */
  onStreaming: (streaming: boolean) => void;
  onOverview: (overview: AdminOverview) => void;
}

export interface AdminStream {
  start: () => void;
  stop: () => void;
}

export function createAdminStream(
  deps: AdminStreamDeps,
  callbacks: AdminStreamCallbacks,
): AdminStream {
  let stream: EventStreamHandle | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let everOpened = false;
  let running = false;

  const close = () => {
    stream?.close();
    stream = null;
  };

  function open(): void {
    let handle: EventStreamHandle | null = null;
    handle = deps.subscribe({
      onOpen: () => {
        if (!running || stream !== handle) return;
        everOpened = true;
        callbacks.onStreaming(true);
      },
      onOverview: (overview) => {
        if (!running || stream !== handle) return;
        callbacks.onOverview(overview);
      },
      onError: () => {
        if (!running || stream !== handle) return;
        close();
        callbacks.onStreaming(false);
        // A stream that never opened is not supported (or not allowed) here: stay on polling.
        if (everOpened) {
          clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            if (running && stream === null) open();
          }, ADMIN.streamRetryMs);
        }
      },
    });
    stream = handle;
  }

  return {
    start: () => {
      if (running) return;
      running = true;
      open();
    },
    stop: () => {
      running = false;
      close();
      clearTimeout(retryTimer);
    },
  };
}

/** What changed between two overviews, to refresh only the data that depends on it. */
export function overviewChanges(
  previous: AdminOverview | undefined,
  next: AdminOverview,
): { votes: boolean; candidates: boolean } {
  if (!previous) return { votes: true, candidates: true };
  return {
    votes:
      previous.turnout.votesReceived !== next.turnout.votesReceived ||
      previous.election.state !== next.election.state,
    candidates: previous.candidateCount !== next.candidateCount,
  };
}
