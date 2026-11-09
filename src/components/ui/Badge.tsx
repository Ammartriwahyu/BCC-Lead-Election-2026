import type { ReactNode } from 'react';

import { cx } from '@/lib/utils/cx';

export type BadgeTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

/** Figma "Pilketum / Badge status" (36:2898). Only for real states (voting status, voted / not voted). */
const tones: Record<BadgeTone, string> = {
  info: 'bg-status-info-bg text-primary-700',
  success: 'bg-status-success-bg text-text-success',
  warning: 'bg-status-warning-bg text-orange-700',
  danger: 'bg-status-danger-bg text-red-700',
  neutral: 'bg-neutral-100 text-text-primary',
};

interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
  size?: 'default' | 'small';
}

export function Badge({ tone, children, className, size = 'default' }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-full whitespace-nowrap',
        size === 'default' ? 'px-12 py-4 text-body-2-semibold' : 'px-8 py-2 text-caption-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
