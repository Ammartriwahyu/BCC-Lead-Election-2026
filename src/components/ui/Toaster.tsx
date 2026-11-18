'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { CheckCircleIcon } from '@/components/icons/CheckCircleIcon';
import { UI } from '@/config/constants';
import { content } from '@/content/copy';
import { cx } from '@/lib/utils/cx';

/**
 * info / danger: NEW (not in Figma) cards for admin conflicts and failed actions (DEVIATIONS).
 * success: Figma A6 "Candidate added / removed" pill (navy, green check), spec 4.4 (3 s).
 * Own implementation instead of Radix Toast (≈ 17 KB Brotli) to stay within the JS budget.
 */
export type ToastTone = 'info' | 'danger' | 'success';

interface ToastInput {
  title: string;
  description?: string;
  tone: ToastTone;
  /** Defaults to UI.toastDurationMs. */
  durationMs?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastApi {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** One toast. Disappears after UI.toastDurationMs. Errors use role="alert", the rest role="status". */
function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  // Hovering pauses the timer so the message can be read (WCAG 2.2.1). Toasts hold no controls,
  // so there is nothing to focus; plain listeners keep the element non-interactive.
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const pause = () => {
      setPaused(true);
    };
    const resume = () => {
      setPaused(false);
    };
    element.addEventListener('pointerenter', pause);
    element.addEventListener('pointerleave', resume);
    return () => {
      element.removeEventListener('pointerenter', pause);
      element.removeEventListener('pointerleave', resume);
    };
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(() => {
      onDismiss(item.id);
    }, item.durationMs ?? UI.toastDurationMs);
    return () => {
      clearTimeout(timer);
    };
  }, [item.durationMs, item.id, onDismiss, paused]);

  if (item.tone === 'success') {
    return (
      <li
        ref={ref}
        role="status"
        className="flex animate-toast-in items-center gap-8 self-end rounded-full bg-bg-sidebar py-4 pr-16 pl-6 text-body-1-medium text-text-on-dark"
      >
        <CheckCircleIcon size={24} className="shrink-0 text-green-500" />
        <span>{item.title}</span>
      </li>
    );
  }

  return (
    <li
      ref={ref}
      role={item.tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'flex animate-toast-in flex-col gap-4 rounded-lg border-l-4 bg-surface-card p-16 shadow-dropdown',
        item.tone === 'danger' ? 'border-text-danger' : 'border-action-primary',
      )}
    >
      <p className="text-body-1-semibold text-text-primary">{item.title}</p>
      {item.description ? (
        <p className="text-body-2 text-text-secondary">{item.description}</p>
      ) : null}
    </li>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((input: ToastInput) => {
    nextId.current += 1;
    const id = nextId.current;
    setItems((current) => [...current, { ...input, id }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* The list is always in the DOM so screen readers already watch it when a toast arrives. */}
      <section
        aria-label={content.toast.region}
        className="pointer-events-none fixed right-16 bottom-16 z-[60] w-[min(400px,calc(100vw-32px))]"
      >
        <ol className="pointer-events-auto flex flex-col gap-12">
          {items.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </ol>
      </section>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}
