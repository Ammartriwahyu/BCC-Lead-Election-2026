import { act, renderHook, screen } from '@testing-library/react';

import { navigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';

import { AutoSignOutNotice } from './components/AutoSignOutNotice';
import { IdleSignOutDialog } from './components/IdleSignOutDialog';
import { OfflineBanner } from './components/OfflineBanner';
import { useCountdown } from './useCountdown';
import { useIdleTimer } from './useIdleTimer';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCountdown', () => {
  it('counts down and calls onDone once', () => {
    const onDone = vi.fn();
    const { result, rerender } = renderHook(({ running }) => useCountdown(3, running, onDone), {
      initialProps: { running: true },
    });
    expect(result.current).toBe(3);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(result.current).toBe(2);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(0);
    expect(onDone).toHaveBeenCalledTimes(1);
    rerender({ running: false });
    expect(result.current).toBe(3);
  });
});

describe('useIdleTimer', () => {
  it('becomes idle after the timeout and activity postpones it', () => {
    const { result } = renderHook(() => useIdleTimer(true, 1000));
    act(() => {
      vi.advanceTimersByTime(800);
      window.dispatchEvent(new Event('keydown'));
      vi.advanceTimersByTime(800);
    });
    expect(result.current.idle).toBe(false);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.idle).toBe(true);
    act(() => {
      result.current.reset();
    });
    expect(result.current.idle).toBe(false);
  });

  it('is never idle while disabled', () => {
    const { result } = renderHook(() => useIdleTimer(false, 10));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.idle).toBe(false);
  });
});

describe('booth components', () => {
  it('asks "Still there?" after inactivity, then signs out', async () => {
    renderWithProviders(<IdleSignOutDialog enabled />);
    act(() => {
      vi.advanceTimersByTime(90_500);
    });
    expect(await screen.findByRole('dialog', { name: 'Still there?' })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    await vi.waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/sign-in?reason=signed-out');
    });
  });

  it('shows the auto sign-out countdown and signs out at zero', async () => {
    renderWithProviders(<AutoSignOutNotice />);
    expect(screen.getByRole('timer')).toHaveTextContent('Signing you out in 3s');
    act(() => {
      vi.advanceTimersByTime(3_500);
    });
    await vi.waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/sign-in?reason=signed-out');
    });
  });

  it('shows the offline banner while offline', () => {
    renderWithProviders(<OfflineBanner />);
    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    spy.mockRestore();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();
  });
});
