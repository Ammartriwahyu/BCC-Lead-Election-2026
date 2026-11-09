'use client';

import type { ReactNode } from 'react';
import { Drawer } from 'vaul';

import { cx } from '@/lib/utils/cx';

import { useReturnFocus } from './useReturnFocus';

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Stacked full-width buttons, primary first (Figma MO frames). */
  actions?: ReactNode;
  dismissible?: boolean;
  /** Hide the visible title (e.g. the Submitting sheet shows its own status row). */
  hideTitle?: boolean;
}

/**
 * Figma "Bottom sheet" (81:4049): radius 20 top corners, padding 12/20/32, gap 16,
 * 40×4 handle in neutral/200. Bottom padding adds env(safe-area-inset-bottom).
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  dismissible = true,
  hideTitle = false,
}: BottomSheetProps) {
  const returnFocus = useReturnFocus(open);
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} dismissible={dismissible}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-primary-900/60" />
        <Drawer.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          onCloseAutoFocus={returnFocus}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-16 overflow-y-auto rounded-t-xl bg-surface-card px-20 pt-12 pb-[calc(var(--space-32)+env(safe-area-inset-bottom))] outline-none"
        >
          <Drawer.Handle className="mx-0! h-4! w-40! rounded-full! bg-neutral-200! opacity-100!" />
          <Drawer.Title className={cx('text-heading-5 text-text-primary', hideTitle && 'sr-only')}>
            {title}
          </Drawer.Title>
          {description ? (
            <Drawer.Description className="text-body-2 text-text-secondary">
              {description}
            </Drawer.Description>
          ) : null}
          {children}
          {actions ? <div className="flex w-full flex-col gap-12 pt-8">{actions}</div> : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
