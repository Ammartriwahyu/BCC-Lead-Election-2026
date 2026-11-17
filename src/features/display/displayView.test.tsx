import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { DISPLAY } from '@/config/constants';
import { subscribeDisplay } from '@/lib/api/endpoints';
import type { DisplayPayload } from '@/lib/api/types';
import { computeTurnout } from '@/lib/utils/results';
import { server } from '@/mocks/node';
import { applyScenario } from '@/mocks/scenarios';

import { DisplayView } from './components/DisplayView';
import { fitScale, useFullscreenKey, useIdleCursor, useWakeLock } from './stage';
import { useScreenTransition } from './useScreenTransition';

describe('DisplayView', () => {
  it('starts on the empty frame, then shows the screen on air (polling without EventSource)', async () => {
    applyScenario('open');
    render(<DisplayView />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(await screen.findByRole('heading', { level: 1, name: /turnout/ })).toHaveTextContent(
      '0.7%',
    );
    expect(screen.getByTestId('display-stage').closest('main')).toBeInTheDocument();
    // No buttons or links on the public display.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says "Reconnecting…" after 30 s without a connection', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    server.use(http.get('*/api/display', () => HttpResponse.error()));
    render(<DisplayView />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DISPLAY.disconnectedIndicatorAfterMs + 1000);
    });
    expect(screen.getByTestId('display-reconnecting')).toHaveTextContent('Reconnecting…');
    vi.useRealTimers();
  });
});

describe('useScreenTransition', () => {
  const open = (votes: number): DisplayPayload => ({
    screen: 'VOTING_OPEN',
    turnout: computeTurnout(100, votes),
  });

  it('fades only when the screen changes', () => {
    vi.useFakeTimers();
    const first = open(1);
    const { result, rerender } = renderHook(({ p }) => useScreenTransition(p), {
      initialProps: { p: first },
    });
    expect(result.current).toEqual({ current: first, leaving: null });

    const update = open(2);
    rerender({ p: update });
    expect(result.current).toEqual({ current: update, leaving: null });

    const closed: DisplayPayload = {
      screen: 'VOTING_CLOSED',
      turnout: computeTurnout(100, 2),
    };
    rerender({ p: closed });
    expect(result.current).toEqual({ current: closed, leaving: update });
    act(() => {
      vi.advanceTimersByTime(DISPLAY.fadeMs);
    });
    expect(result.current.leaving).toBeNull();
    vi.useRealTimers();
  });
});

describe('stage helpers', () => {
  it('fits 1920×1080 inside any window', () => {
    expect(fitScale(1920, 1080)).toBe(1);
    expect(fitScale(1280, 800)).toBeCloseTo(2 / 3);
    expect(fitScale(3840, 1080)).toBe(1);
    expect(fitScale(0, 600)).toBe(0);
  });

  it('hides the cursor after 3 s without movement', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIdleCursor());
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(DISPLAY.hideCursorAfterMs);
    });
    expect(result.current).toBe(true);
    act(() => {
      fireEvent.pointerMove(window);
    });
    expect(result.current).toBe(false);
    vi.useRealTimers();
  });

  it('F toggles fullscreen; other keys and modifiers do nothing', () => {
    const request = vi.fn(() => Promise.resolve());
    const exit = vi.fn(() => Promise.resolve());
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: request,
      configurable: true,
    });
    Object.defineProperty(document, 'exitFullscreen', { value: exit, configurable: true });
    let element: Element | null = null;
    Object.defineProperty(document, 'fullscreenElement', {
      get: () => element,
      configurable: true,
    });
    renderHook(() => {
      useFullscreenKey();
    });
    fireEvent.keyDown(window, { key: 'g' });
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    expect(request).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'F' });
    expect(request).toHaveBeenCalledTimes(1);
    element = document.documentElement;
    fireEvent.keyDown(window, { key: 'f' });
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('takes a wake lock and takes it again when the tab comes back', async () => {
    const release = vi.fn(() => Promise.resolve());
    const lock = Object.assign(new EventTarget(), { release });
    const requestLock = vi.fn(() => Promise.resolve(lock));
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: requestLock },
      configurable: true,
    });
    const { unmount } = renderHook(() => {
      useWakeLock();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(requestLock).toHaveBeenCalledWith('screen');
    // The browser drops the lock when the tab is hidden.
    lock.dispatchEvent(new Event('release'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(requestLock).toHaveBeenCalledTimes(2);
    unmount();
    expect(release).toHaveBeenCalled();
    Reflect.deleteProperty(navigator, 'wakeLock');
  });

  it('ignores a refused wake lock', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: vi.fn(() => Promise.reject(new Error('denied'))) },
      configurable: true,
    });
    const { unmount } = renderHook(() => {
      useWakeLock();
    });
    await act(async () => {
      await Promise.resolve();
    });
    unmount();
    Reflect.deleteProperty(navigator, 'wakeLock');
  });
});

describe('subscribeDisplay', () => {
  class FakeEventSource extends EventTarget {
    static last: FakeEventSource | null = null;
    readonly url: string;
    closed = false;
    constructor(url: string) {
      super();
      this.url = url;
      FakeEventSource.last = this;
    }
    close() {
      this.closed = true;
    }
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null without EventSource', () => {
    expect(subscribeDisplay({ onOpen: vi.fn(), onPayload: vi.fn(), onError: vi.fn() })).toBeNull();
  });

  it('opens /api/display/stream and parses display events', () => {
    vi.stubGlobal('EventSource', FakeEventSource);
    const handlers = { onOpen: vi.fn(), onPayload: vi.fn(), onError: vi.fn() };
    const handle = subscribeDisplay(handlers);
    const source = FakeEventSource.last;
    if (!source) throw new Error('no EventSource');
    expect(source.url).toMatch(/\/api\/display\/stream$/);

    source.dispatchEvent(new Event('open'));
    expect(handlers.onOpen).toHaveBeenCalled();
    const data = JSON.stringify({
      screen: 'voting_closed',
      status: 'closed',
      turnout: { registered: 4, voted: 3, not_voted: 1, percent: 75 },
    });
    source.dispatchEvent(new MessageEvent('display', { data }));
    expect(handlers.onPayload).toHaveBeenCalledWith(
      expect.objectContaining({ screen: 'VOTING_CLOSED' }),
    );
    expect(handlers.onPayload.mock.calls[0]?.[0]).toMatchObject({ turnout: { ratio: 0.75 } });
    // A malformed message is dropped, not fatal.
    source.dispatchEvent(new MessageEvent('display', { data: '{"screen":"NOPE"}' }));
    expect(handlers.onPayload).toHaveBeenCalledTimes(1);
    source.dispatchEvent(new Event('error'));
    expect(handlers.onError).toHaveBeenCalled();
    handle?.close();
    expect(source.closed).toBe(true);
  });
});
