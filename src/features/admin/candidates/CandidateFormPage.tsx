'use client';

import dynamic from 'next/dynamic';

import { AdminPageSkeleton } from '../components/AdminPageSkeleton';

/**
 * A7 / A8 entry: the form (React Hook Form, Zod, photo field, preview card, dialogs) loads as its
 * own chunk while the page skeleton shows, in parallel with the data it needs (JS budget).
 */
const CandidateFormView = dynamic(
  () => import('./CandidateFormView').then((m) => m.CandidateFormView),
  { ssr: false, loading: () => <AdminPageSkeleton /> },
);

export function CandidateFormPage({ id }: { id: string | null }) {
  return <CandidateFormView id={id} />;
}
