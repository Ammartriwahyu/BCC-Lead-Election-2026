'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Brace } from '@/components/layout/Brace';
import { Button } from '@/components/ui/Button';
import { SearchField } from '@/components/ui/SearchField';
import { ADMIN } from '@/config/constants';
import { adminCopy } from '@/content/adminCopy';
import { formatNumber } from '@/lib/utils/format';

import { parsePageParam, votersHref } from '../adminRouting';
import { useAdminOverview } from '../useAdminOverview';
import { useAdminVoters } from '../useAdminVoters';
import { AdminLoadError } from './AdminLoadError';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminPageSkeleton } from './AdminPageSkeleton';
import { VoterPagination } from './VoterPagination';
import { VoterTable } from './VoterTable';

const copy = adminCopy.voters;

/**
 * A5 · Voter list (43:2388 not started, 43:2637 open, 43:2886 closed; last page and no results).
 * Search and page live in the URL (`?q=&page=`) and are applied by the backend. Typing is
 * debounced; only the latest request is kept.
 */
export function VotersView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const page = parsePageParam(searchParams.get('page'));
  const voters = useAdminVoters(q, page);
  // The voter list response has no voting status; the header badge reads it from the overview.
  const overview = useAdminOverview();

  const [input, setInput] = useState(q);
  // `q` this component asked for vs. `q` that changed from outside (sidebar link, Back).
  const [seenQ, setSeenQ] = useState(q);
  const [requestedQ, setRequestedQ] = useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    if (q !== requestedQ) {
      setRequestedQ(q);
      setInput(q);
    }
  }

  useEffect(() => {
    const next = input.trim();
    if (next === q) return undefined;
    const timer = setTimeout(() => {
      setRequestedQ(next);
      router.replace(votersHref(next, 1));
    }, ADMIN.searchDebounceMs);
    return () => {
      clearTimeout(timer);
    };
  }, [input, q, router]);

  // The backend clamps the page (e.g. ?page=999): keep the URL honest.
  const serverPage = voters.isPlaceholderData ? undefined : voters.data?.page;
  useEffect(() => {
    if (serverPage !== undefined && serverPage !== page) {
      router.replace(votersHref(q, serverPage));
    }
  }, [page, q, router, serverPage]);

  if (!voters.data || !overview.data) {
    return voters.isError || overview.isError ? (
      <AdminLoadError
        onRetry={() => {
          void voters.refetch();
          void overview.refetch();
        }}
      />
    ) : (
      <AdminPageSkeleton />
    );
  }

  const { items, total, pageSize, pageCount, turnout } = voters.data;
  const { election } = overview.data;
  const shownPage = voters.data.page;
  const from = (shownPage - 1) * pageSize + 1;
  const empty = total === 0;

  const clearSearch = () => {
    setInput('');
    setRequestedQ('');
    router.replace(votersHref('', 1));
  };

  return (
    <>
      <AdminPageHeader
        title={copy.title}
        state={election.state}
        subtitle={copy.subtitle[election.state](
          formatNumber(turnout.votesReceived),
          formatNumber(turnout.registeredVoters),
        )}
      />
      <section
        aria-label={copy.title}
        className="flex flex-col gap-16 rounded-xl border border-border-card bg-surface-card p-20"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-16 gap-y-12">
          <SearchField
            label={copy.searchLabel}
            placeholder={copy.searchPlaceholder}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
            }}
            autoComplete="off"
            spellCheck={false}
            className="md:w-442"
          />
          <p role="status" className="text-body-2 text-text-secondary tabular-nums">
            {empty
              ? copy.noResultsCount
              : copy.showing(
                  formatNumber(from),
                  formatNumber(from + items.length - 1),
                  formatNumber(total),
                )}
          </p>
        </div>
        <div>
          <VoterTable voters={items} busy={voters.isPlaceholderData} />
          {empty && q ? (
            <div className="flex flex-col items-center gap-12 px-24 py-32 text-center">
              <Brace pose="woah" width={110} />
              <h2 className="text-heading-6 wrap-anywhere text-text-primary">
                {copy.emptyTitle(q)}
              </h2>
              <p className="text-body-2 text-text-secondary">{copy.emptyBody}</p>
              <Button variant="secondary" onClick={clearSearch}>
                {copy.clearSearch}
              </Button>
            </div>
          ) : null}
        </div>
        {empty ? null : (
          <VoterPagination
            page={shownPage}
            pageCount={pageCount}
            onPageChange={(next) => {
              router.push(votersHref(q, next));
            }}
          />
        )}
      </section>
    </>
  );
}
