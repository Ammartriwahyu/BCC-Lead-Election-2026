/**
 * Typed endpoint functions. Paths and DTO shapes are ASSUMED (docs/API_CONTRACT.md).
 * DTO -> domain mapping happens here and nowhere else.
 */
import { z } from 'zod';

import { HTTP } from '@/config/constants';
import { computeTurnout, summarizeResults } from '@/lib/utils/results';

import { request } from './client';
import {
  adminOverviewDtoSchema,
  adminResultsDtoSchema,
  adminSessionDtoSchema,
  adminVotersDtoSchema,
  candidateDtoSchema,
  candidatesDtoSchema,
  displayControlDtoSchema,
  displayPayloadDtoSchema,
  electionDtoSchema,
  voteReceiptDtoSchema,
  voterMeDtoSchema,
  voterSessionDtoSchema,
  type CandidateDto,
  type CandidateTallyDto,
  type DisplayPayloadDto,
  type ElectionDto,
  type VoterMeDto,
} from './schemas';
import type {
  AdminMe,
  AdminOverview,
  AdminResults,
  AdminVotersPage,
  Candidate,
  DisplayControl,
  DisplayPayload,
  DisplayScreen,
  Election,
  ElectionAction,
  ElectionState,
  VoteReceipt,
  VoterMe,
  VoterSession,
} from './types';
/* ---------- mappers ---------- */

export const toElection = (dto: ElectionDto): Election => ({
  state: dto.state,
  version: dto.version,
  updatedAt: new Date(dto.updatedAt),
});

export const toVoterMe = (dto: VoterMeDto): VoterMe => ({
  ...dto,
  submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : null,
});

export const toCandidate = (dto: CandidateDto): Candidate => ({ ...dto });

const toTallies = (items: readonly Omit<CandidateTallyDto, 'candidateId'>[]) =>
  summarizeResults(items.map((item) => ({ candidateId: String(item.number), ...item })));

export function toDisplayPayload(dto: DisplayPayloadDto): DisplayPayload {
  switch (dto.screen) {
    case 'OPENS_SOON':
      return { screen: dto.screen, version: dto.version, candidates: dto.candidates };
    case 'VOTING_OPEN':
    case 'VOTING_CLOSED':
    case 'WINNER_REVEAL':
      return {
        screen: dto.screen,
        version: dto.version,
        turnout: computeTurnout(dto.totals.registeredVoters, dto.totals.votesReceived),
      };
    case 'FINAL_RESULTS':
    case 'MOST_VOTES':
      return {
        screen: dto.screen,
        version: dto.version,
        turnout: computeTurnout(dto.totals.registeredVoters, dto.totals.votesReceived),
        results: toTallies(dto.candidates),
      };
  }
}

const emptySchema = z.object({}).loose();

/* ---------- voter ---------- */

export async function voterSignIn(email: string, password: string): Promise<VoterSession> {
  const dto = await request('/auth/voter/sign-in', {
    method: 'POST',
    body: { email, password },
    schema: voterSessionDtoSchema,
    skipAuthRedirect: true,
  });
  return { voter: toVoterMe(dto.voter), election: toElection(dto.election) };
}

export async function voterSignOut(): Promise<void> {
  await request('/auth/sign-out', { method: 'POST', schema: emptySchema, skipAuthRedirect: true });
}

export async function getMe(): Promise<VoterMe> {
  return toVoterMe(await request('/me', { schema: voterMeDtoSchema }));
}

/** Public: used by sign-in status strip and every voter page poll. */
export async function getElection(): Promise<Election> {
  return toElection(
    await request('/election', { schema: electionDtoSchema, skipAuthRedirect: true }),
  );
}

export async function getCandidates(): Promise<Candidate[]> {
  const dto = await request('/candidates', { schema: candidatesDtoSchema });
  return dto.items.map(toCandidate).sort((a, b) => a.number - b.number);
}

export async function getCandidate(id: string): Promise<Candidate> {
  return toCandidate(
    await request(`/candidates/${encodeURIComponent(id)}`, { schema: candidateDtoSchema }),
  );
}

export async function submitVote(
  candidateId: string,
  idempotencyKey: string,
): Promise<VoteReceipt> {
  const dto = await request('/votes', {
    method: 'POST',
    body: { candidateId, expectedState: 'OPEN' },
    headers: { 'Idempotency-Key': idempotencyKey },
    schema: voteReceiptDtoSchema,
    timeoutMs: HTTP.submitTimeoutMs,
  });
  return { submittedAt: new Date(dto.submittedAt) };
}

/* ---------- admin ---------- */

export async function adminSignIn(email: string, password: string): Promise<AdminMe> {
  const dto = await request('/admin/auth/sign-in', {
    method: 'POST',
    body: { email, password },
    schema: adminSessionDtoSchema,
    skipAuthRedirect: true,
  });
  return dto.admin;
}

export async function adminSignOut(): Promise<void> {
  await request('/admin/auth/sign-out', {
    method: 'POST',
    schema: emptySchema,
    skipAuthRedirect: true,
  });
}

export async function getAdminMe(): Promise<AdminMe> {
  return (await request('/admin/me', { schema: adminSessionDtoSchema })).admin;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const dto = await request('/admin/overview', { schema: adminOverviewDtoSchema });
  return {
    election: toElection(dto.election),
    turnout: computeTurnout(dto.registeredVoters, dto.votesReceived),
    display: dto.display,
  };
}

export async function changeElectionState(
  action: ElectionAction,
  expectedState: ElectionState,
): Promise<Election> {
  const dto = await request(`/admin/election/${action}`, {
    method: 'POST',
    body: { expectedState },
    schema: electionDtoSchema,
  });
  return toElection(dto);
}

export async function getAdminVoters(params: {
  q: string;
  page: number;
  signal?: AbortSignal;
}): Promise<AdminVotersPage> {
  const search = new URLSearchParams({ page: String(params.page) });
  if (params.q) search.set('q', params.q);
  const dto = await request(`/admin/voters?${search.toString()}`, {
    schema: adminVotersDtoSchema,
    ...(params.signal ? { signal: params.signal } : {}),
  });
  return {
    items: dto.items,
    page: dto.page,
    pageSize: dto.pageSize,
    total: dto.total,
    pageCount: Math.max(1, Math.ceil(dto.total / dto.pageSize)),
    turnout: computeTurnout(dto.registeredVoters, dto.votesReceived),
    election: toElection(dto.election),
  };
}

export async function getAdminResults(): Promise<AdminResults> {
  const dto = await request('/admin/results', { schema: adminResultsDtoSchema });
  const results = summarizeResults(dto.candidates);
  return {
    election: toElection(dto.election),
    turnout: computeTurnout(dto.registeredVoters, results.validVotes),
    results,
    display: dto.display,
  };
}

export async function setDisplayScreen(
  screen: DisplayScreen,
  expectedVersion: number,
): Promise<DisplayControl> {
  return request('/admin/display', {
    method: 'PUT',
    body: { screen, expectedVersion },
    schema: displayControlDtoSchema,
  });
}

/* ---------- public display ---------- */

export async function getDisplay(signal?: AbortSignal): Promise<DisplayPayload> {
  const dto = await request('/display', {
    schema: displayPayloadDtoSchema,
    skipAuthRedirect: true,
    ...(signal ? { signal } : {}),
  });
  return toDisplayPayload(dto);
}

export const DISPLAY_STREAM_PATH = '/display/stream';
