import type { BrowserContext, Page, Request } from '@playwright/test';

/** Give up waiting for the page's requests after this long (the test then measures anyway). */
const IDLE_TIMEOUT_MS = 30_000;
const IDLE_POLL_MS = 100;
/** Open for as long as the page lives, so never "in flight" in the sense meant here. */
const LONG_LIVED = new Set(['eventsource', 'websocket']);

/**
 * Counts the page's requests in flight. An image or fetch that is still loading keeps its element
 * (and so the whole page it was on) alive until it finishes, so measuring while a slow request runs
 * would read as a leak: on CI the image optimizer is slow enough for that (DOM nodes +180–320 at
 * the end of a booth run, back to +1 once the requests finish).
 */
export function trackRequests(page: Page): { idle: () => Promise<void> } {
  const inFlight = new Set<Request>();
  page.on('request', (request) => {
    if (!LONG_LIVED.has(request.resourceType())) inFlight.add(request);
  });
  const done = (request: Request) => {
    inFlight.delete(request);
  };
  page.on('requestfinished', done);
  page.on('requestfailed', done);
  return {
    async idle() {
      const deadline = Date.now() + IDLE_TIMEOUT_MS;
      while (inFlight.size > 0 && Date.now() < deadline) {
        await page.waitForTimeout(IDLE_POLL_MS);
      }
    },
  };
}

export interface PageMetrics {
  heapMb: number;
  nodes: number;
  listeners: number;
}

/** Heap after a forced GC, DOM nodes and JS event listeners (Chromium DevTools protocol). */
export async function pageMetrics(context: BrowserContext, page: Page): Promise<PageMetrics> {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  await cdp.detach();
  const value = (name: string) => metrics.find((m) => m.name === name)?.value ?? 0;
  return {
    heapMb: value('JSHeapUsedSize') / (1024 * 1024),
    nodes: value('Nodes'),
    listeners: value('JSEventListeners'),
  };
}
