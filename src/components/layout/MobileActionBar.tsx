'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface MobileActionBarProps {
  label: string;
  value: string;
  action: ReactNode;
}

/** Read by the `pb-mobile-action-bar` utility (globals.css). */
const HEIGHT_VAR = '--mobile-action-bar-height';

/**
 * Figma "Pilketum / Mobile action bar" (78:3275): pinned to the bottom below 768 px,
 * within thumb reach. Bottom padding includes the safe-area inset.
 * Long names wrap instead of being cut (spec §10), so the bar can grow: it publishes its height
 * and pages using it add `pb-mobile-action-bar` to their scroll area, which follows that height.
 */
export function MobileActionBar({ label, value, action }: MobileActionBarProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    if (!bar || typeof ResizeObserver === 'undefined') return undefined;
    const root = document.documentElement;
    const publish = () => {
      root.style.setProperty(HEIGHT_VAR, `${String(bar.offsetHeight)}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty(HEIGHT_VAR);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-12 border-t border-border-card bg-surface-card px-16 pt-12 pb-[calc(var(--space-24)+env(safe-area-inset-bottom))] shadow-dropdown md:hidden"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-caption text-text-secondary">{label}</p>
        <p className="text-body-1-semibold wrap-anywhere text-text-primary">{value}</p>
      </div>
      {action}
    </div>
  );
}
