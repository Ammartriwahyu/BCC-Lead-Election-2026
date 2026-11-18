'use client';

import dynamic from 'next/dynamic';

/**
 * The open / close / reopen confirmation, loaded after the page (JS budget, PLAN 2026-11-17).
 * It only matters once a committee member clicks an action.
 */
export const LazyElectionActionDialog = dynamic(
  () => import('./ElectionActionDialog').then((m) => m.ElectionActionDialog),
  { ssr: false },
);
