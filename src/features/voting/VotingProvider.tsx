'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAnnouncer } from '@/components/ui/Announcer';
import { ROUTES } from '@/config/constants';
import { content } from '@/content/copy';
import { getElection, getMe, submitVote } from '@/lib/api/endpoints';
import type { VoterMe } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

import { classifySubmitError } from './submitOutcome';

export type SubmitResult = 'submitted' | 'navigated' | 'stayed' | 'skipped';

interface PendingVote {
  candidateId: string;
}

interface VotingApi {
  selectedId: string | null;
  select: (candidateId: string) => void;
  clear: () => void;
  isSubmitting: boolean;
  /** True after this device submitted, until sign-out. */
  justSubmitted: boolean;
  /** The pick that failed with a transient error (V4). */
  pendingVote: PendingVote | null;
  submit: () => Promise<SubmitResult>;
  retry: () => Promise<SubmitResult>;
  /** Set when the voter arrives at a detail page from the list, so Back can use history. */
  cameFromList: boolean;
  setCameFromList: (value: boolean) => void;
}

const VotingContext = createContext<VotingApi | null>(null);

/**
 * Selection and submit flow for one signed-in voter. State lives only in memory inside the
 * session layout: it is gone after sign-out or reload (booth rule: no web storage).
 */
export function VotingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { announce } = useAnnouncer();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingVote, setPendingVote] = useState<PendingVote | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [cameFromList, setCameFromList] = useState(false);
  // Synchronous guard: a double click can fire twice before React re-renders the disabled button.
  const inflight = useRef(false);

  const select = useCallback((candidateId: string) => {
    setSelectedId(candidateId);
    // A new pick is a new vote attempt; the failed one (V4) belonged to another candidate.
    setPendingVote((current) => (current?.candidateId === candidateId ? current : null));
  }, []);

  const clear = useCallback(() => {
    setSelectedId(null);
    setPendingVote(null);
  }, []);

  const send = useCallback(
    async (vote: PendingVote): Promise<SubmitResult> => {
      setPendingVote(vote);
      setIsSubmitting(true);
      announce(content.confirm.submittingTitle);
      try {
        const receipt = await submitVote(vote.candidateId);
        setJustSubmitted(true);
        queryClient.setQueryData<VoterMe>(queryKeys.voter.me, (me) =>
          me ? { ...me, status: 'VOTED', submittedAt: receipt.submittedAt } : me,
        );
        setPendingVote(null);
        setSelectedId(null);
        router.replace(ROUTES.voteSubmitted);
        return 'submitted';
      } catch (error) {
        const outcome = classifySubmitError(error);
        if (outcome.kind === 'session') return 'navigated';
        if (outcome.kind === 'stay') {
          setSelectedId(null);
          setPendingVote(null);
          await queryClient.invalidateQueries({ queryKey: queryKeys.voter.candidates });
          return 'stayed';
        }
        if (outcome.kind === 'not-open') {
          setPendingVote(null);
          const election = await queryClient
            .query({ queryKey: queryKeys.election, queryFn: getElection, staleTime: 0 })
            .catch(() => null);
          if (election?.state === 'CLOSED') {
            router.replace(ROUTES.closed);
            return 'navigated';
          }
          return 'stayed';
        }
        if (outcome.refetch) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.voter.me });
        }
        router.replace(outcome.to);
        return 'navigated';
      } finally {
        setIsSubmitting(false);
      }
    },
    [announce, queryClient, router],
  );

  const submit = useCallback(async (): Promise<SubmitResult> => {
    if (inflight.current || !selectedId) return 'skipped';
    inflight.current = true;
    try {
      return await send({ candidateId: selectedId });
    } finally {
      inflight.current = false;
    }
  }, [selectedId, send]);

  /**
   * V4 "Try again": check `has_voted` first (Design notes: Submit errors; backend note 3), so a
   * vote that did get stored before the connection dropped is never sent twice.
   */
  const retry = useCallback(async (): Promise<SubmitResult> => {
    if (inflight.current || !pendingVote) return 'skipped';
    inflight.current = true;
    setIsSubmitting(true);
    try {
      let me: VoterMe;
      try {
        me = await queryClient.query({
          queryKey: queryKeys.voter.me,
          queryFn: getMe,
          staleTime: 0,
        });
      } catch (error) {
        const outcome = classifySubmitError(error);
        if (outcome.kind === 'session') return 'navigated';
        // Still offline or failing: stay on V4 so the voter can try again.
        return 'stayed';
      }
      if (me.status === 'VOTED') {
        setJustSubmitted(true);
        setPendingVote(null);
        setSelectedId(null);
        router.replace(ROUTES.voteSubmitted);
        return 'submitted';
      }
      return await send(pendingVote);
    } finally {
      inflight.current = false;
      setIsSubmitting(false);
    }
  }, [pendingVote, queryClient, router, send]);

  const api = useMemo<VotingApi>(
    () => ({
      selectedId,
      select,
      clear,
      isSubmitting,
      justSubmitted,
      pendingVote,
      submit,
      retry,
      cameFromList,
      setCameFromList,
    }),
    [
      cameFromList,
      clear,
      isSubmitting,
      justSubmitted,
      pendingVote,
      retry,
      select,
      selectedId,
      submit,
    ],
  );

  return <VotingContext.Provider value={api}>{children}</VotingContext.Provider>;
}

export function useVoting(): VotingApi {
  const api = useContext(VotingContext);
  if (!api) throw new Error('useVoting must be used inside <VotingProvider>');
  return api;
}
