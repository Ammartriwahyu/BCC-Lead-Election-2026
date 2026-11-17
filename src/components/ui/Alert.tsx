import type { ReactNode } from 'react';

import { DangerIcon } from '@/components/icons/DangerIcon';
import { LockIcon } from '@/components/icons/LockIcon';
import { cx } from '@/lib/utils/cx';

type AlertTone = 'danger' | 'info' | 'locked';

interface AlertProps {
  tone: AlertTone;
  children: ReactNode;
  className?: string;
  /** "alert" interrupts screen readers (errors); "status" is polite. */
  role?: 'alert' | 'status';
  id?: string;
}

/**
 * danger: Figma "Error message" in the sign-in card (status/danger-bg, red/700 text, danger icon).
 * info:   Figma A4 results note (bg/subtle, brand dot).
 * locked: Figma A6 locked note (status/warning-bg, orange/700 text, lock icon).
 */
export function Alert({ tone, children, className, role, id }: AlertProps) {
  return (
    <div
      id={id}
      role={role}
      className={cx(
        'flex w-full items-center gap-12 rounded-lg px-16 py-12 text-body-2-medium',
        tone === 'danger' && 'bg-status-danger-bg text-red-700',
        tone === 'info' && 'bg-bg-subtle text-text-primary',
        tone === 'locked' && 'bg-status-warning-bg text-orange-700',
        className,
      )}
    >
      {tone === 'danger' ? <DangerIcon size={20} className="shrink-0" /> : null}
      {tone === 'locked' ? <LockIcon size={20} className="shrink-0" /> : null}
      {tone === 'info' ? (
        <span aria-hidden="true" className="size-12 shrink-0 rounded-full bg-action-primary" />
      ) : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
