import type { BrowserContext, Page } from '../fixtures';

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
