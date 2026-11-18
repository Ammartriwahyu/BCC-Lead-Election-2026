/**
 * Live data for /display, framework-agnostic so it can be tested with fake timers.
 *
 * 1. Stream first (SSE). If the stream cannot be opened at all (no EventSource, 404 from a backend
 *    without it), poll GET /display every 3 s instead and stay on polling.
 * 2. If a stream that worked drops, poll at once and try the stream again later.
 * 3. A failed poll backs off: 1 s, 2 s, 4 s … up to 30 s, then back to 3 s after a success.
 * 4. `disconnected` turns true after 30 s without a healthy connection; the screen keeps the last
 *    payload it had (a videotron should never go blank).
 */
import { DISPLAY, POLLING } from '@/config/constants';
import type { DisplaySubscription, EventStreamHandle } from '@/lib/api/endpoints';
import type { DisplayPayload } from '@/lib/api/types';

export type FeedTransport = 'connecting' | 'stream' | 'polling';

export interface FeedSnapshot {
  payload: DisplayPayload | null;
  transport: FeedTransport;
  /** True once the connection has been unhealthy for DISPLAY.disconnectedIndicatorAfterMs. */
  disconnected: boolean;
}

export interface FeedDeps {
  fetchPayload: (signal: AbortSignal) => Promise<DisplayPayload>;
  subscribe: (handlers: DisplaySubscription) => EventStreamHandle | null;
  now: () => number;
}

export interface DisplayFeed {
  start: () => void;
  stop: () => void;
}

/** Delay before the next poll after `failures` failed polls in a row. */
export function backoffDelay(failures: number): number {
  if (failures <= 0) return POLLING.displayMs;
  return Math.min(DISPLAY.backoffBaseMs * 2 ** (failures - 1), DISPLAY.backoffMaxMs);
}

/**
 * The API sends no version. A poll answer is dropped when a stream event arrived after the poll
 * started: the stream is always at least as new, so a late poll can never undo a screen change.
 */
export function isPollFresh(streamEventsAtStart: number, streamEventsNow: number): boolean {
  return streamEventsAtStart === streamEventsNow;
}

export function createDisplayFeed(
  deps: FeedDeps,
  onChange: (snapshot: FeedSnapshot) => void,
): DisplayFeed {
  let snapshot: FeedSnapshot = { payload: null, transport: 'connecting', disconnected: false };
  let stream: EventStreamHandle | null = null;
  let streamEverOpened = false;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let streamRetryTimer: ReturnType<typeof setTimeout> | undefined;
  let indicatorTimer: ReturnType<typeof setTimeout> | undefined;
  let pollAbort: AbortController | null = null;
  let failures = 0;
  let streamEvents = 0;
  let unhealthySince: number | null = null;
  let running = false;
  // Read through a function: the flag can change while a poll is awaiting its answer.
  const isRunning = () => running;

  const emit = (patch: Partial<FeedSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    onChange(snapshot);
  };

  const accept = (payload: DisplayPayload) => {
    emit({ payload });
  };

  const markHealthy = () => {
    unhealthySince = null;
    clearTimeout(indicatorTimer);
    if (snapshot.disconnected) emit({ disconnected: false });
  };

  const markUnhealthy = () => {
    if (unhealthySince !== null) return;
    unhealthySince = deps.now();
    clearTimeout(indicatorTimer);
    indicatorTimer = setTimeout(() => {
      if (running && unhealthySince !== null) emit({ disconnected: true });
    }, DISPLAY.disconnectedIndicatorAfterMs);
  };

  const stopPolling = () => {
    clearTimeout(pollTimer);
    pollAbort?.abort();
    pollAbort = null;
  };

  const schedulePoll = (delay: number) => {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(() => void poll(), delay);
  };

  async function poll(): Promise<void> {
    if (!running) return;
    const controller = new AbortController();
    pollAbort = controller;
    const eventsAtStart = streamEvents;
    try {
      const payload = await deps.fetchPayload(controller.signal);
      if (controller.signal.aborted || !isRunning()) return;
      failures = 0;
      if (isPollFresh(eventsAtStart, streamEvents)) accept(payload);
      markHealthy();
    } catch {
      if (controller.signal.aborted || !isRunning()) return;
      failures += 1;
      markUnhealthy();
    }
    if (snapshot.transport === 'polling') schedulePoll(backoffDelay(failures));
  }

  const startPolling = () => {
    if (snapshot.transport !== 'polling') emit({ transport: 'polling' });
    failures = 0;
    schedulePoll(0);
  };

  const closeStream = () => {
    stream?.close();
    stream = null;
  };

  function openStream(): void {
    let handle: EventStreamHandle | null = null;
    handle = deps.subscribe({
      onOpen: () => {
        if (!running || stream !== handle) return;
        streamEverOpened = true;
        stopPolling();
        if (snapshot.transport !== 'stream') emit({ transport: 'stream' });
        markHealthy();
      },
      onPayload: (payload) => {
        if (!running || stream !== handle) return;
        streamEvents += 1;
        accept(payload);
        markHealthy();
      },
      onError: () => {
        if (!running || stream !== handle) return;
        closeStream();
        markUnhealthy();
        startPolling();
        // A stream that never opened is not supported here: stay on polling.
        if (streamEverOpened) {
          clearTimeout(streamRetryTimer);
          streamRetryTimer = setTimeout(() => {
            if (running && stream === null) openStream();
          }, DISPLAY.streamRetryMs);
        }
      },
    });
    stream = handle;
    if (handle === null) startPolling();
  }

  return {
    start: () => {
      if (running) return;
      running = true;
      openStream();
    },
    stop: () => {
      running = false;
      closeStream();
      stopPolling();
      clearTimeout(streamRetryTimer);
      clearTimeout(indicatorTimer);
    },
  };
}
