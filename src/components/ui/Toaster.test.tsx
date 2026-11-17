import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';

import { UI } from '@/config/constants';

import { ToastProvider, useToast } from './Toaster';

function Trigger() {
  const { toast } = useToast();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          toast({ title: 'Saved', tone: 'info' });
        }}
      >
        info
      </button>
      <button
        type="button"
        onClick={() => {
          toast({ title: 'Failed', description: 'Try again.', tone: 'danger' });
        }}
      >
        danger
      </button>
    </>
  );
}

describe('Toaster', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces info politely and errors assertively, then removes them', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    const region = screen.getByRole('region', { name: 'Notifications' });
    fireEvent.click(screen.getByRole('button', { name: 'info' }));
    fireEvent.click(screen.getByRole('button', { name: 'danger' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(screen.getByRole('alert')).toHaveTextContent('FailedTry again.');
    expect(region).toContainElement(screen.getByRole('alert'));

    act(() => {
      vi.advanceTimersByTime(UI.toastDurationMs);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('stays while hovered and leaves after the pointer moves away', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'info' }));
    const toast = screen.getByRole('status');
    fireEvent.pointerEnter(toast);
    act(() => {
      vi.advanceTimersByTime(UI.toastDurationMs * 2);
    });
    expect(toast).toBeInTheDocument();
    fireEvent.pointerLeave(toast);
    act(() => {
      vi.advanceTimersByTime(UI.toastDurationMs);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('needs its provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/);
  });
});
