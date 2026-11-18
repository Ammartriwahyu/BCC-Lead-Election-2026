import { ADMIN } from '@/config/constants';
import type { AdminSubscription } from '@/lib/api/endpoints';
import type { AdminOverview } from '@/lib/api/types';

import { createAdminStream, overviewChanges } from './adminStream';

const overview = (votes: number, candidates = 3): AdminOverview => ({
  election: { state: 'OPEN' },
  turnout: {
    registeredVoters: 139,
    votesReceived: votes,
    notVoted: 139 - votes,
    ratio: votes / 139,
  },
  candidateCount: candidates,
  display: { activeScreen: 'VOTING_OPEN' },
  candidatesLocked: true,
});

/** A fake /admin/stream: records every subscription so a test can drive it. */
function fakeStreams() {
  const opened: AdminSubscription[] = [];
  const closed: number[] = [];
  const subscribe = (handlers: AdminSubscription) => {
    const index = opened.length;
    opened.push(handlers);
    return {
      close: () => {
        closed.push(index);
      },
    };
  };
  return { opened, closed, subscribe };
}

describe('createAdminStream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops polling while the stream is open and passes each overview on', () => {
    const streams = fakeStreams();
    const streaming: boolean[] = [];
    const received: AdminOverview[] = [];
    const stream = createAdminStream(streams, {
      onStreaming: (open) => streaming.push(open),
      onOverview: (next) => received.push(next),
    });
    stream.start();
    streams.opened[0]?.onOpen();
    streams.opened[0]?.onOverview(overview(5));
    expect(streaming).toEqual([true]);
    expect(received).toEqual([overview(5)]);
    stream.stop();
    expect(streams.closed).toEqual([0]);
  });

  it('falls back to polling when a working stream drops, and tries again later', () => {
    const streams = fakeStreams();
    const streaming: boolean[] = [];
    const stream = createAdminStream(streams, {
      onStreaming: (open) => streaming.push(open),
      onOverview: () => undefined,
    });
    stream.start();
    streams.opened[0]?.onOpen();
    streams.opened[0]?.onError();
    expect(streaming).toEqual([true, false]);
    expect(streams.closed).toEqual([0]);

    vi.advanceTimersByTime(ADMIN.streamRetryMs - 1);
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
    const stream = createAdminStream(streams, {
      onStreaming: (open) => streaming.push(open),
      onOverview: () => undefined,
    });
    stream.start();
    streams.opened[0]?.onError();
    vi.advanceTimersByTime(ADMIN.streamRetryMs * 2);
    expect(streams.opened).toHaveLength(1);
    expect(streaming).toEqual([false]);
    stream.stop();
  });

  it('ignores events from a stream it already closed', () => {
    const streams = fakeStreams();
    const received: AdminOverview[] = [];
    const stream = createAdminStream(streams, {
      onStreaming: () => undefined,
      onOverview: (next) => received.push(next),
    });
    stream.start();
    const first = streams.opened[0];
    stream.stop();
    first?.onOverview(overview(9));
    expect(received).toEqual([]);
  });

  it('stays on polling where EventSource does not exist', () => {
    const streaming: boolean[] = [];
    const stream = createAdminStream(
      { subscribe: () => null },
      { onStreaming: (open) => streaming.push(open), onOverview: () => undefined },
    );
    stream.start();
    vi.advanceTimersByTime(ADMIN.streamRetryMs * 2);
    expect(streaming).toEqual([]);
    stream.stop();
  });
});

describe('overviewChanges', () => {
  it('refreshes votes on a new vote or a state change, candidates on a new count', () => {
    expect(overviewChanges(undefined, overview(1))).toEqual({ votes: true, candidates: true });
    expect(overviewChanges(overview(1), overview(1))).toEqual({ votes: false, candidates: false });
    expect(overviewChanges(overview(1), overview(2))).toEqual({ votes: true, candidates: false });
    expect(overviewChanges(overview(1), { ...overview(1), election: { state: 'CLOSED' } })).toEqual(
      { votes: true, candidates: false },
    );
    expect(overviewChanges(overview(1, 3), overview(1, 2))).toEqual({
      votes: false,
      candidates: true,
    });
  });
});
