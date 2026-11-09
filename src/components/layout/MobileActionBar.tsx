import type { ReactNode } from 'react';

interface MobileActionBarProps {
  label: string;
  value: string;
  action: ReactNode;
}

/**
 * Figma "Pilketum / Mobile action bar" (78:3275): pinned to the bottom below 768 px,
 * within thumb reach. Bottom padding includes the safe-area inset.
 * Pages using it add `pb-mobile-action-bar` to their scroll area.
 */
export function MobileActionBar({ label, value, action }: MobileActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-12 border-t border-border-card bg-surface-card px-16 pt-12 pb-[calc(var(--space-24)+env(safe-area-inset-bottom))] shadow-dropdown md:hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-caption text-text-secondary">{label}</p>
        <p className="truncate text-body-1-semibold text-text-primary">{value}</p>
      </div>
      {action}
    </div>
  );
}
