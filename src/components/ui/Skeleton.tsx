import { cx } from '@/lib/utils/cx';

/** NEW (not in Figma): loading placeholder in bg/subtle. Decorative. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cx('animate-pulse rounded-lg bg-bg-subtle', className)} />
  );
}
