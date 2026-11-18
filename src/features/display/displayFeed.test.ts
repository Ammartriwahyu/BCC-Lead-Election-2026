import { DISPLAY, POLLING } from '@/config/constants';
import type { DisplaySubscription } from '@/lib/api/endpoints';
import type { DisplayPayload } from '@/lib/api/types';
import { computeTurnout } from '@/lib/utils/results';

import {
  backoffDelay,
  createDisplayFeed,
  isPollFresh,
  type FeedDeps,
  type FeedSnapshot,
} from './displayFeed';

/** Payloads are told apart by their vote count (the API sends no version). */
const payload = (votes: number): DisplayPayload => ({
  screen: 'VOTING_OPEN',
  turnout: computeTurnout(100, votes),
});

const votesOf = (snapshot: FeedSnapshot | undefined) =>
  snapshot?.payload && 'turnout' in snapshot.payload
    ? snapshot.payload.turnout.votesReceived
    : undefined;

/** A controllable stand-in for the SSE subscription. */
function fakeStream() {
  let handlers: DisplaySubscription | null = null;
  const closes = { count: 0 };
  const subscribe = vi.fn((next: DisplaySubscription) => {
    handlers = next;
    return {
      close: () => {
        closes.count += 1;
      },
    };
  });
  const current = () => {
    if (!handlers) throw new Error('stream not opened');
    return handlers;
  };
  return {
    subscribe,
    closes,
    open: () => {
      current().onOpen();
    },
    send: (p: DisplayPayload) => {
      current().onPayload(p);
    },
    fail: () => {
      current().onError();
    },
  };
}

function setup(overrides: Partial<FeedDeps> = {}) {
  const snapshots: FeedSnapshot[] = [];
  const fetchPayload = vi.fn(() => Promise.resolve(payload(1)));
  const deps: FeedDeps = {
    fetchPayload,
    subscribe: () => null,
    now: () => Date.now(),
    ...overrides,
  };
  const feed = createDisplayFeed(deps, (snapshot) => snapshots.push(snapshot));
  const last = () => snapshots.at(-1);
  return { feed, snapshots, last, deps };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('backoffDelay / isPollFresh', () => {
  it('backs off 1, 2, 4 … 30 s and polls every 3 s when healthy', () => {
    expect(backoffDelay(0)).toBe(POLLING.displayMs);
    expect([1, 2, 3, 4, 5, 6, 7].map(backoffDelay)).toEqual([
      1000, 2000, 4000, 8000, 16000, 30000, 30000,
    ]);
  });

  it('drops a poll answer when a stream event arrived after the poll started', () => {
    expect(isPollFresh(0, 0)).toBe(true);
    expect(isPollFresh(2, 3)).toBe(false);
  });
});

describe('createDisplayFeed: polling', () => {
  it('polls at once and then every 3 s when there is no stream', async () => {
    const { feed, last, deps } = setup();
    feed.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.fetchPayload).toHaveBeenCalledTimes(1);
    expect(last()).toMatchObject({
      transport: 'polling',
      payload: { turnout: { votesReceived: 1 } },
    });
    await vi.advanceTimersByTimeAsync(POLLING.displayMs);
    expect(deps.fetchPayload).toHaveBeenCalledTimes(2);
    feed.stop();
  });

  it('backs off on failures, flags "reconnecting" after 30 s and recovers', async () => {
    let fail = true;
    const fetchPayload = vi.fn(() =>
      fail ? Promise.reject(new Error('down')) : Promise.resolve(payload(2)),
    );
    const { feed, last } = setup({ fetchPayload });
    feed.start();
    await vi.advanceTimersByTimeAsync(0); // fail 1
    await vi.advanceTimersByTimeAsync(1000); // fail 2
    await vi.advanceTimersByTimeAsync(2000); // fail 3
    expect(fetchPayload).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(3999);
    expect(fetchPayload).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1); // fail 4 after 4 s
    expect(fetchPayload).toHaveBeenCalledTimes(4);
    expect(last()?.disconnected).toBe(false);

    await vi.advanceTimersByTimeAsync(DISPLAY.disconnectedIndicatorAfterMs);
    expect(last()?.disconnected).toBe(true);
    expect(last()?.payload).toBeNull();

    fail = false;
    await vi.advanceTimersByTimeAsync(DISPLAY.backoffMaxMs);
    expect(last()).toMatchObject({
      disconnected: false,
      payload: { turnout: { votesReceived: 2 } },
    });
    // Back to the normal 3 s interval.
    const calls = fetchPayload.mock.calls.length;
    await vi.advanceTimersByTimeAsync(POLLING.displayMs);
    expect(fetchPayload).toHaveBeenCalledTimes(calls + 1);
    feed.stop();
  });

  it('keeps the last payload on screen while the connection is down', async () => {
    let fail = false;
    const fetchPayload = vi.fn(() =>
      fail ? Promise.reject(new Error('down')) : Promise.resolve(payload(40)),
    );
    const { feed, last } = setup({ fetchPayload });
    feed.start();
    await vi.advanceTimersByTimeAsync(0);
    fail = true;
    await vi.advanceTimersByTimeAsync(DISPLAY.disconnectedIndicatorAfterMs + POLLING.displayMs);
    expect(last()).toMatchObject({
      disconnected: true,
      payload: { turnout: { votesReceived: 40 } },
    });
    feed.stop();
  });

  it('stops polling and ignores late answers after stop()', async () => {
    let resolve: (p: DisplayPayload) => void = () => undefined;
    const fetchPayload = vi.fn(
      () =>
        new Promise<DisplayPayload>((r) => {
          resolve = r;
        }),
    );
    const { feed, snapshots } = setup({ fetchPayload });
    feed.start();
    await vi.advanceTimersByTimeAsync(0);
    feed.stop();
    const count = snapshots.length;
    resolve(payload(9));
    await vi.advanceTimersByTimeAsync(POLLING.displayMs * 3);
    expect(snapshots).toHaveLength(count);
    expect(fetchPayload).toHaveBeenCalledTimes(1);
  });
});

describe('createDisplayFeed: stream', () => {
  it('uses the stream and does not poll while it is open', async () => {
    const stream = fakeStream();
    const { feed, last, deps } = setup({ subscribe: stream.subscribe });
    feed.start();
    stream.open();
    stream.send(payload(3));
    await vi.advanceTimersByTimeAsync(POLLING.displayMs * 5);
    expect(deps.fetchPayload).not.toHaveBeenCalled();
    expect(last()).toMatchObject({
      transport: 'stream',
      payload: { turnout: { votesReceived: 3 } },
    });
    // Every stream message is the latest state (the API sends no version).
    stream.send(payload(2));
    expect(votesOf(last())).toBe(2);
    feed.stop();
    expect(stream.closes.count).toBe(1);
  });

  it('a stream that never opens means "not supported": poll and stay on polling', async () => {
    const stream = fakeStream();
    const { feed, last, deps } = setup({ subscribe: stream.subscribe });
    feed.start();
    stream.fail();
    await vi.advanceTimersByTimeAsync(0);
    expect(last()?.transport).toBe('polling');
    expect(deps.fetchPayload).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(DISPLAY.streamRetryMs * 2);
    expect(stream.subscribe).toHaveBeenCalledTimes(1);
    feed.stop();
  });

  it('a dropped stream falls back to polling, then tries the stream again', async () => {
    const stream = fakeStream();
    const { feed, last, deps } = setup({ subscribe: stream.subscribe });
    feed.start();
    stream.open();
    stream.fail();
    expect(stream.closes.count).toBe(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(last()?.transport).toBe('polling');
    expect(deps.fetchPayload).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(DISPLAY.streamRetryMs);
    expect(stream.subscribe).toHaveBeenCalledTimes(2);
    stream.open();
    expect(last()?.transport).toBe('stream');
    const polls = vi.mocked(deps.fetchPayload).mock.calls.length;
    await vi.advanceTimersByTimeAsync(POLLING.displayMs * 3);
    expect(deps.fetchPayload).toHaveBeenCalledTimes(polls);
    feed.stop();
  });

  it('ignores events from a stream it already closed', () => {
    const stream = fakeStream();
    const { feed, last } = setup({ subscribe: stream.subscribe });
    feed.start();
    stream.open();
    stream.send(payload(1));
    feed.stop();
    stream.send(payload(7));
    stream.fail();
    expect(votesOf(last())).toBe(1);
  });
});
