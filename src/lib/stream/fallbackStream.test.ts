import type { StreamSubscription } from '@/lib/api/endpoints';

import { createFallbackStream } from './fallbackStream';

const RETRY_MS = 60_000;

/** A fake stream endpoint: records every subscription so a test can drive it. */
function fakeStreams() {
  const opened: StreamSubscription<number>[] = [];
  const closed: number[] = [];
  const subscribe = (handlers: StreamSubscription<number>) => {
    const index = opened.length;
    opened.push(handlers);
    return {
      close: () => {
        closed.push(index);
      },
    };
  };
  return { opened, closed, subscribe, retryMs: RETRY_MS };
}

describe('createFallbackStream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops polling while the stream is open and passes each event on', () => {
    const streams = fakeStreams();
    const streaming: boolean[] = [];
    const received: number[] = [];
    const stream = createFallbackStream(streams, {
      onStreaming: (open) => streaming.push(open),
      onEvent: (value) => received.push(value),
    });
    stream.start();
    streams.opened[0]?.onOpen();
    streams.opened[0]?.onEvent(5);
    expect(streaming).toEqual([true]);
    expect(received).toEqual([5]);
    stream.stop();
    expect(streams.closed).toEqual([0]);
  });

  it('falls back to polling when a working stream drops, and tries again later', () => {
    const streams = fakeStreams();
    const streaming: boolean[] = [];
    const stream = createFallbackStream(streams, {
      onStreaming: (open) => streaming.push(open),
      onEvent: () => undefined,
    });
    stream.start();
    streams.opened[0]?.onOpen();
    streams.opened[0]?.onError();
    expect(streaming).toEqual([true, false]);
    expect(streams.closed).toEqual([0]);

    vi.advanceTimersByTime(RETRY_MS - 1);
    expect(streams.opened).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(streams.opened).toHaveLength(2);
    streams.opened[1]?.onOpen();
    expect(streaming).toEqual([true, false, true]);
    stream.stop();
  });

  it('keeps polling and does not retry when the stream never opens (401, no stream)', () => {
    const streams = fakeStreams();
    const streaming: boolean[] = [];
    const stream = createFallbackStream(streams, {
      onStreaming: (open) => streaming.push(open),
      onEvent: () => undefined,
    });
    stream.start();
    streams.opened[0]?.onError();
    vi.advanceTimersByTime(RETRY_MS * 2);
    expect(streams.opened).toHaveLength(1);
    expect(streaming).toEqual([false]);
    stream.stop();
  });

  it('ignores events from a stream it already closed', () => {
    const streams = fakeStreams();
    const received: number[] = [];
    const stream = createFallbackStream(streams, {
      onStreaming: () => undefined,
      onEvent: (value) => received.push(value),
    });
    stream.start();
    const first = streams.opened[0];
    stream.stop();
    first?.onEvent(9);
    expect(received).toEqual([]);
  });

  it('stays on polling where EventSource does not exist', () => {
    const streaming: boolean[] = [];
    const stream = createFallbackStream(
      { subscribe: () => null, retryMs: RETRY_MS },
      { onStreaming: (open) => streaming.push(open), onEvent: () => undefined },
    );
    stream.start();
    vi.advanceTimersByTime(RETRY_MS * 2);
    expect(streaming).toEqual([]);
    stream.stop();
  });
});
