'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Display control, loaded after the page (JS budget, PLAN 2026-11-18): it sits below the fold on
 * Overview and Results. The skeleton keeps its place so nothing jumps when it arrives.
 */
export const LazyDisplayControlCard = dynamic(
  () => import('./DisplayControlCard').then((m) => m.DisplayControlCard),
  { ssr: false, loading: () => <Skeleton className="h-600 rounded-xl" /> },
);
