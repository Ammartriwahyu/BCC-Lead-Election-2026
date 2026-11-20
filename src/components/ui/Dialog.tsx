'use client';

import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactNode } from 'react';

import { cx } from '@/lib/utils/cx';

import { useReturnFocus } from './useReturnFocus';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** false = Esc, outside click and close are blocked (e.g. while submitting). */
  dismissible?: boolean;
  /** Replace the default card layout entirely (e.g. the Submitting card). */
  bare?: boolean;
  className?: string;
}

const block = (event: Event) => {
  event.preventDefault();
};

/**
 * Figma "Pilketum / Dialog" (37:899): 520 wide, radius 20, padding 32, gap 20, Heading 5 title,
 * Body 1 secondary text, Shadow modal. Scrim: color/primary/900 at 60%.
 * Focus is trapped while open and returns to the element that opened it (useReturnFocus).
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  dismissible = true,
  bare = false,
  className,
}: DialogProps) {
  const returnFocus = useReturnFocus(open);
  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !dismissible) return;
        onOpenChange(next);
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-primary-900/60 data-[state=closed]:animate-fade-out-fast" />
        <RadixDialog.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          onCloseAutoFocus={returnFocus}
          onEscapeKeyDown={dismissible ? undefined : block}
          onPointerDownOutside={dismissible ? undefined : block}
          onInteractOutside={dismissible ? undefined : block}
          className={cx(
            'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 animate-dialog-in overflow-y-auto rounded-xl bg-surface-card shadow-modal outline-none data-[state=closed]:animate-dialog-out',
            bare ? 'max-w-max' : 'flex max-w-520 flex-col gap-20 p-32',
            className,
          )}
        >
          {bare ? (
            <>
              <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
              {children}
            </>
          ) : (
            <>
              <RadixDialog.Title className="text-heading-5 text-text-primary">
                {title}
              </RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="text-body-1 text-text-secondary">
                  {description}
                </RadixDialog.Description>
              ) : null}
              {children}
              {actions ? <div className="flex w-full gap-16 *:flex-1">{actions}</div> : null}
            </>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
