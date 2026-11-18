'use client';

import { notFound, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ROUTES } from '@/config/constants';
import { hasErrorCode } from '@/lib/api/errors';

import { AdminLoadError } from '../components/AdminLoadError';
import { AdminPageSkeleton } from '../components/AdminPageSkeleton';
import { useAdminOverview } from '../useAdminOverview';
import { CandidateForm } from './CandidateForm';
import { useAdminCandidate, useAdminCandidates } from './useAdminCandidates';

/**
 * Loads what the candidate form needs. Once voting has opened the form is not reachable any more
 * (the list is read-only), so a stale tab or a deep link goes back to the list.
 */
export function CandidateFormView({ id }: { id: string | null }) {
  const router = useRouter();
  const overview = useAdminOverview();
  const candidates = useAdminCandidates();
  const one = useAdminCandidate(id ?? '');
  const candidate = id ? one : null;

  const locked = overview.data
    ? overview.data.election.state !== 'NOT_STARTED' || overview.data.candidatesLocked
    : false;
  useEffect(() => {
    if (locked) router.replace(ROUTES.adminCandidates);
  }, [locked, router]);

  // A refetch error after the form loaded (e.g. right after Delete) keeps the form on screen.
  const candidateFailed = Boolean(candidate && !candidate.data && candidate.isError);
  if (candidateFailed && hasErrorCode(candidate?.error, 'NOT_FOUND')) notFound();

  const failed = overview.isError || candidates.isError || candidateFailed;
  if (failed) {
    return (
      <AdminLoadError
        onRetry={() => {
          void overview.refetch();
          void candidates.refetch();
          if (candidate) void candidate.refetch();
        }}
      />
    );
  }
  if (!overview.data || !candidates.data || locked || (candidate && !candidate.data)) {
    return <AdminPageSkeleton />;
  }
  return (
    <CandidateForm
      key={candidate?.data.id ?? 'new'}
      candidate={candidate?.data ?? null}
      candidates={candidates.data}
    />
  );
}
