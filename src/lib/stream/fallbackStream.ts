/**
 * A server-sent event stream with polling as the fallback, framework-agnostic so it can be tested
 * with fake timers. Used by the committee panel (/admin/stream) and the voter pages
 * (/election/stream):
 *
 * 1. Stream first. While it is open, the page stops polling (`onStreaming(true)`) and every event
 *    updates it.
 * 2. If the stream cannot be opened at all (no EventSource, 401, a backend without it), the page
 *    keeps polling and does not try again.
 * 3. If a stream that worked drops, polling resumes at once and the stream is tried again after
 *    `retryMs`.
 */
import type { EventStreamHandle, StreamSubscription } from '@/lib/api/endpoints';

export interface FallbackStreamDeps<T> {
  subscribe: (handlers: StreamSubscription<T>) => EventStreamHandle | null;
  retryMs: number;
}

export interface FallbackStreamCallbacks<T> {
  /** The stream opened (true) or is down (false). */
  onStreaming: (streaming: boolean) => void;
  onEvent: (value: T) => void;
}

export interface FallbackStream {
  start: () => void;
  stop: () => void;
}

export function createFallbackStream<T>(
  deps: FallbackStreamDeps<T>,
  callbacks: FallbackStreamCallbacks<T>,
): FallbackStream {
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
    const current = () => running && stream === handle;
    handle = deps.subscribe({
      onOpen: () => {
        if (!current()) return;
        everOpened = true;
        callbacks.onStreaming(true);
      },
      onEvent: (value) => {
        if (current()) callbacks.onEvent(value);
      },
      onError: () => {
        if (!current()) return;
        close();
        callbacks.onStreaming(false);
        // A stream that never opened is not supported (or not allowed) here: stay on polling.
        if (everOpened) {
          clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            if (running && stream === null) open();
          }, deps.retryMs);
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
