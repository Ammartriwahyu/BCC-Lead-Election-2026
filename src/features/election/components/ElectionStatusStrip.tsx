'use client';

import { Skeleton } from '@/components/ui/Skeleton';
import { content } from '@/content/copy';

import { useElection } from '../useElection';
import { useElectionAnnouncer } from '../useElectionAnnouncer';
import { ElectionBadge } from './ElectionBadge';

/**
 * Sign-in "Voting status" strip (V0a–c / MV0a–c): primary/700 box with the state badge.
 * Read when the page loads and when the tab is focused again, not polled: it is only a label
 * (signing in works in every state, and the pages after sign-in follow the state live).
 */
export function ElectionStatusStrip() {
  const { data } = useElection({ poll: false });
  useElectionAnnouncer(data?.state);

  if (!data) {
    return <Skeleton className="h-48 w-full bg-primary-700 md:w-320" />;
  }
  return (
    <div
      className="flex w-full items-center gap-12 rounded-lg bg-primary-700 p-12 md:w-auto md:self-start md:pr-16"
      data-testid="election-status"
    >
      <ElectionBadge state={data.state} />
      <p className="flex-1 text-body-2-medium text-text-on-dark">
        {content.election.strip[data.state]}
      </p>
    </div>
  );
}
