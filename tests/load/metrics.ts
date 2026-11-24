import type { BrowserContext, Page, Request } from '@playwright/test';

/** Give up waiting for the page's requests after this long (the test then measures anyway). */
const IDLE_TIMEOUT_MS = 30_000;
const IDLE_POLL_MS = 100;
/** Open for as long as the page lives, so never "in flight" in the sense meant here. */
const LONG_LIVED = new Set(['eventsource', 'websocket']);

/**
 * Counts the page's requests in flight. An image or fetch that is still loading keeps its element
 * (and so the whole page it was on) alive until it finishes, so measuring while a slow request runs
 * would read as a leak (images held back 3 s: DOM nodes +580 at the end of a booth run, back to +1
 * once the requests finish).
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

/** One forced GC can leave freed DOM nodes uncounted for a moment; a few in a row settle it. */
const GC_PASSES = 3;
const GC_PAUSE_MS = 100;
/** Detached DOM trees listed when a leak check fails. */
const MAX_DETACHED_LISTED = 10;

/** Heap after forced GCs, DOM nodes and JS event listeners (Chromium DevTools protocol). */
export async function pageMetrics(context: BrowserContext, page: Page): Promise<PageMetrics> {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  for (let pass = 0; pass < GC_PASSES; pass += 1) {
    await cdp.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(GC_PAUSE_MS);
  }
  const { metrics } = await cdp.send('Performance.getMetrics');
  await cdp.detach();
  const value = (name: string) => metrics.find((m) => m.name === name)?.value ?? 0;
  return {
    heapMb: value('JSHeapUsedSize') / (1024 * 1024),
    nodes: value('Nodes'),
    listeners: value('JSEventListeners'),
  };
}

/**
 * The lowest value of each metric over a few samples. Something released a moment later (a page
 * still held by a slow request, a GC that has not finished) shows in one sample, not in all of
 * them; a leak shows in every sample after it.
 */
export function lowest(samples: PageMetrics[]): PageMetrics {
  return {
    heapMb: Math.min(...samples.map((s) => s.heapMb)),
    nodes: Math.min(...samples.map((s) => s.nodes)),
    listeners: Math.min(...samples.map((s) => s.listeners)),
  };
}

interface DetachedNode {
  treeNode: { nodeName: string; attributes?: string[] };
  retainedNodeIds: number[];
}

/**
 * Detached DOM trees still alive (root element, its attributes and how many nodes it keeps), for
 * the message of a failed leak check. Experimental DevTools method: says so if it is missing.
 */
export async function detachedTrees(context: BrowserContext, page: Page): Promise<string> {
  const cdp = await context.newCDPSession(page);
  try {
    await cdp.send('DOM.enable');
    await cdp.send('HeapProfiler.collectGarbage');
    const { detachedNodes } = (await cdp.send('DOM.getDetachedDomNodes' as never)) as {
      detachedNodes: DetachedNode[];
    };
    const trees = detachedNodes
      .toSorted((a, b) => b.retainedNodeIds.length - a.retainedNodeIds.length)
      .slice(0, MAX_DETACHED_LISTED)
      .map(
        ({ treeNode, retainedNodeIds }) =>
          `<${treeNode.nodeName.toLowerCase()} ${(treeNode.attributes ?? []).join(' ')}> ${String(retainedNodeIds.length)} nodes`,
      );
    return trees.length > 0 ? trees.join('; ') : 'none';
  } catch (error) {
    return `unavailable (${String(error)})`;
  } finally {
    await cdp.detach();
  }
}
