'use client';

import { useEffect, useState } from 'react';

import { getDisplay, subscribeDisplay } from '@/lib/api/endpoints';

import { createDisplayFeed, type FeedDeps, type FeedSnapshot } from './displayFeed';

const INITIAL: FeedSnapshot = { payload: null, transport: 'connecting', disconnected: false };

const DEFAULT_DEPS: FeedDeps = {
  fetchPayload: getDisplay,
  subscribe: subscribeDisplay,
  now: () => Date.now(),
};

/** The payload on air, kept live by the stream / polling feed for as long as the page is open. */
export function useDisplayFeed(deps: FeedDeps = DEFAULT_DEPS): FeedSnapshot {
  const [snapshot, setSnapshot] = useState<FeedSnapshot>(INITIAL);

  useEffect(() => {
    const feed = createDisplayFeed(deps, setSnapshot);
    feed.start();
    return () => {
      feed.stop();
    };
  }, [deps]);

  return snapshot;
}
