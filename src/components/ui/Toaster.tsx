'use client';

import { Toast } from 'radix-ui';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { UI } from '@/config/constants';
import { cx } from '@/lib/utils/cx';

/** NEW (not in Figma): toast for admin conflicts and failed actions. Logged in DEVIATIONS. */
export type ToastTone = 'info' | 'danger';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastApi {
  toast: (input: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((input: Omit<ToastItem, 'id'>) => {
    setItems((current) => [...current, { ...input, id: Date.now() + Math.random() }]);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      <Toast.Provider duration={UI.toastDurationMs} swipeDirection="right">
        {children}
        {items.map((item) => (
          <Toast.Root
            key={item.id}
            type={item.tone === 'danger' ? 'foreground' : 'background'}
            onOpenChange={(open) => {
              if (!open) setItems((current) => current.filter((t) => t.id !== item.id));
            }}
            className={cx(
              'flex flex-col gap-4 rounded-lg border-l-4 bg-surface-card p-16 shadow-dropdown',
              item.tone === 'danger' ? 'border-text-danger' : 'border-action-primary',
            )}
          >
            <Toast.Title className="text-body-1-semibold text-text-primary">
              {item.title}
            </Toast.Title>
            {item.description ? (
              <Toast.Description className="text-body-2 text-text-secondary">
                {item.description}
              </Toast.Description>
            ) : null}
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed right-16 bottom-16 z-[60] flex w-[min(400px,calc(100vw-32px))] flex-col gap-12 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}
