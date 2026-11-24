/**
 * Typed endpoint functions: the only API the rest of the app uses (features/* hooks).
 * Method, path and response schema of each call come from the registry in contract.ts.
 * DTO -> domain mapping happens here and nowhere else.
 */
import * as z from 'zod/mini';

import { ADMIN, HTTP } from '@/config/constants';
import { computeTurnout, summarizeResults } from '@/lib/utils/results';

import {
  onUnauthorized,
  openEventStream,
  request,
  requestFile,
  type EventStreamHandle,
  type RequestOptions,
} from './client';
import { toPhotoSrc } from './photoUrl';
import { API_ROUTES, pathFor, type RouteName } from './routes';
import {
  adminMeDtoSchema,
  adminOverviewDtoSchema,
  adminResultsDtoSchema,
  adminSessionDtoSchema,
  adminVotersDtoSchema,
  candidateDtoSchema,
  candidatesDtoSchema,
  displayChangeDtoSchema,
  displayPayloadDtoSchema,
  electionDtoSchema,
  electionStateDtoSchema,
  voteReceiptDtoSchema,
  voterLoginDtoSchema,
  voterMeDtoSchema,
  voterSessionDtoSchema,
  type CandidateDto,
  type CandidateResultDto,
  type DisplayPayloadDto,
  type DisplayScreenDto,
  type ElectionStatusDto,
  type TurnoutDto,
  type VoterDto,
} from './schemas';
import type {
  AdminMe,
  AdminOverview,
  AdminResults,
  AdminVotersPage,
  Candidate,
  CandidateInput,
  CandidateTally,
  DisplayControl,
  DisplayPayload,
  DisplayScreen,
  Election,
  ElectionAction,
  ElectionState,
  ExportFile,
  ResultsSummary,
  SignInResult,
  Turnout,
  VoteReceipt,
  VoterMe,
  VoterSession,
} from './types';

/** Re-exported so features never import client.ts (ESLint boundary). */
export { onUnauthorized, type EventStreamHandle };

/* ---------- mappers ---------- */

const STATE: Record<ElectionStatusDto, ElectionState> = {
  not_started: 'NOT_STARTED',
  open: 'OPEN',
  closed: 'CLOSED',
};

const SCREEN: Record<DisplayScreenDto, DisplayScreen> = {
  voting_opens_soon: 'OPENS_SOON',
  voting_open: 'VOTING_OPEN',
  voting_closed: 'VOTING_CLOSED',
  winner_suspense: 'WINNER_REVEAL',
  final_results: 'FINAL_RESULTS',
  most_votes: 'MOST_VOTES',
};

const SCREEN_DTO: Partial<
  Record<DisplayScreen, 'voting_closed' | 'winner_suspense' | 'final_results' | 'most_votes'>
> = {
  VOTING_CLOSED: 'voting_closed',
  WINNER_REVEAL: 'winner_suspense',
  FINAL_RESULTS: 'final_results',
  MOST_VOTES: 'most_votes',
};

export const toElection = (dto: { status: ElectionStatusDto }): Election => ({
  state: STATE[dto.status],
});

export const toTurnout = (dto: TurnoutDto): Turnout => computeTurnout(dto.registered, dto.voted);

export const toVoterMe = (dto: VoterDto): VoterMe => ({
  id: dto.nim,
  name: dto.name,
  email: dto.email,
  status: dto.has_voted ? 'VOTED' : 'NOT_VOTED',
  submittedAt: dto.has_voted && dto.voted_at ? new Date(dto.voted_at) : null,
});

export const toCandidate = (dto: CandidateDto): Candidate => ({
  id: String(dto.id),
  number: dto.ballot_number,
  name: dto.full_name,
  major: dto.study_program,
  classYear: dto.class_year,
  photoUrl: toPhotoSrc(dto.photo_url),
  vision: dto.vision,
  missions: dto.missions,
});

const toTally = (dto: CandidateResultDto): Omit<CandidateTally, 'share'> => ({
  candidateId: String(dto.id),
  number: dto.ballot_number,
  name: dto.full_name,
  major: dto.study_program,
  classYear: dto.class_year,
  photoUrl: toPhotoSrc(dto.photo_url),
  votes: dto.votes,
});

/**
 * Results from the backend's rows. Shares are recomputed from `totalVotes` (not from the rows),
 * so a list with only the winners (MOST_VOTES) still gets the right percentage.
 */
function toResults(rows: readonly CandidateResultDto[], totalVotes: number): ResultsSummary {
  const summary = summarizeResults(rows.map(toTally));
  const candidates = summary.candidates.map((c) => ({
    ...c,
    share: totalVotes === 0 ? 0 : c.votes / totalVotes,
  }));
  const leaderIds = new Set(summary.leaders.map((c) => c.candidateId));
  return {
    candidates,
    validVotes: totalVotes,
    leaders: candidates.filter((c) => leaderIds.has(c.candidateId)),
    isTie: summary.isTie,
  };
}

export function toDisplayPayload(dto: DisplayPayloadDto): DisplayPayload {
  switch (dto.screen) {
    case 'voting_opens_soon':
      return {
        screen: 'OPENS_SOON',
        candidates: [...dto.candidates]
          .sort((a, b) => a.ballot_number - b.ballot_number)
          .map((c) => ({
            number: c.ballot_number,
            name: c.full_name,
            photoUrl: toPhotoSrc(c.photo_url),
          })),
      };
    case 'voting_open':
      return { screen: 'VOTING_OPEN', turnout: toTurnout(dto.turnout) };
    case 'voting_closed':
      return { screen: 'VOTING_CLOSED', turnout: toTurnout(dto.turnout) };
    case 'winner_suspense':
      return {
        screen: 'WINNER_REVEAL',
        turnout: toTurnout(dto.turnout),
        candidateNumbers: dto.candidates.map((c) => c.ballot_number).sort((a, b) => a - b),
      };
    case 'final_results':
      return {
        screen: 'FINAL_RESULTS',
        turnout: toTurnout(dto.turnout),
        results: toResults(dto.results, dto.total_votes),
      };
    case 'most_votes':
      return {
        screen: 'MOST_VOTES',
        turnout: toTurnout(dto.turnout),
        results: toResults(dto.winners, dto.total_votes),
      };
  }
}

const toCandidateBody = (input: CandidateInput) => ({
  ballot_number: input.number,
  full_name: input.name,
  study_program: input.major,
  class_year: input.classYear,
  vision: input.vision,
  missions: input.missions,
});

/* ---------- calling an endpoint ---------- */

const emptySchema = z.looseObject({});

interface CallOptions extends Omit<RequestOptions<z.core.$ZodType>, 'method' | 'schema'> {
  params?: Record<string, string>;
  query?: URLSearchParams;
}

function urlFor(name: RouteName, params?: Record<string, string>, query?: URLSearchParams) {
  const search = query?.toString();
  return pathFor(API_ROUTES[name].path, params) + (search ? `?${search}` : '');
}

/**
 * Calls one endpoint (method and path from API_ROUTES) and validates the answer with the schema
 * the contract names for it. Each call imports only its own schema, so pages do not ship the rest.
 */
function call<S extends z.core.$ZodType>(
  name: RouteName,
  schema: S,
  { params, query, ...options }: CallOptions = {},
): Promise<z.output<S>> {
  return request(urlFor(name, params, query), {
    ...options,
    method: API_ROUTES[name].method,
    schema,
  });
}

/** Same as call() for endpoints that answer 204 No Content. */
async function send(name: RouteName, { params, query, ...options }: CallOptions = {}) {
  await request(urlFor(name, params, query), {
    ...options,
    method: API_ROUTES[name].method,
    schema: emptySchema,
  });
}

/* ---------- voter ---------- */

function toSession(dto: {
  voter: VoterDto;
  election: { status: ElectionStatusDto };
}): VoterSession {
  return { voter: toVoterMe(dto.voter), election: toElection(dto.election) };
}

/** Step 1. UB accounts with 2FA answer with an OTP challenge instead of a session. */
export async function voterSignIn(username: string, password: string): Promise<SignInResult> {
  const dto = await call('voterSignIn', voterLoginDtoSchema, {
    body: { username, password },
    skipAuthRedirect: true,
    timeoutMs: HTTP.signInTimeoutMs,
  });
  if ('otp_required' in dto) {
    return {
      kind: 'otp',
      challenge: {
        flow: dto.flow,
        devices: dto.devices.map((d) => ({ id: d.id, name: d.name, isDefault: d.default })),
      },
    };
  }
  return { kind: 'signed-in', session: toSession(dto) };
}

/** Step 2 for 2FA accounts. */
export async function voterSubmitOtp(
  flow: string,
  code: string,
  deviceId?: string,
): Promise<VoterSession> {
  const dto = await call('voterOtp', voterSessionDtoSchema, {
    body: { flow, code, ...(deviceId ? { device_id: deviceId } : {}) },
    skipAuthRedirect: true,
    timeoutMs: HTTP.signInTimeoutMs,
  });
  return toSession(dto);
}

export async function voterSignOut(): Promise<void> {
  await send('voterSignOut', { skipAuthRedirect: true });
}

export async function getMe(): Promise<VoterMe> {
  return toVoterMe((await call('getMe', voterMeDtoSchema)).voter);
}

/** Public: used by sign-in status strip and every voter page poll. */
export async function getElection(): Promise<Election> {
  return toElection(await call('getElection', electionDtoSchema, { skipAuthRedirect: true }));
}

export async function getCandidates(): Promise<Candidate[]> {
  const dto = await call('getCandidates', candidatesDtoSchema);
  return dto.candidates.map(toCandidate).sort((a, b) => a.number - b.number);
}

/** Final. The API answers without a timestamp; the receipt carries this device's time. */
export async function submitVote(candidateId: string): Promise<VoteReceipt> {
  await call('submitVote', voteReceiptDtoSchema, {
    body: { candidate_id: Number(candidateId) },
    timeoutMs: HTTP.submitTimeoutMs,
  });
  return { submittedAt: new Date() };
}

/* ---------- committee ---------- */

const toAdminMe = (dto: { username: string; display_name?: string | undefined }): AdminMe => ({
  username: dto.username,
  displayName: dto.display_name?.trim() || dto.username,
});

export async function adminSignIn(username: string, password: string): Promise<AdminMe> {
  const dto = await call('adminSignIn', adminSessionDtoSchema, {
    body: { username, password },
    skipAuthRedirect: true,
  });
  return toAdminMe(dto);
}

export async function adminSignOut(): Promise<void> {
  await send('adminSignOut', { skipAuthRedirect: true });
}

export async function getAdminMe(): Promise<AdminMe> {
  return toAdminMe(await call('getAdminMe', adminMeDtoSchema));
}

type AdminOverviewDto = z.output<typeof adminOverviewDtoSchema>;

const toAdminOverview = (dto: AdminOverviewDto): AdminOverview => ({
  election: toElection(dto),
  turnout: toTurnout(dto.turnout),
  candidateCount: dto.candidates,
  display: { activeScreen: SCREEN[dto.display_screen] },
  // Older backends without the field: voting has opened once if opened_at was ever set.
  candidatesLocked: dto.candidates_locked ?? dto.opened_at !== null,
});

export async function getAdminOverview(): Promise<AdminOverview> {
  return toAdminOverview(await call('getAdminOverview', adminOverviewDtoSchema));
}

/** The status each action starts from, sent as `expected_status` so a stale click is refused. */
const ACTION_FROM: Record<ElectionAction, ElectionStatusDto> = {
  open: 'not_started',
  close: 'open',
  reopen: 'closed',
};

export async function changeElectionState(action: ElectionAction): Promise<Election> {
  return toElection(
    await call('changeElectionState', electionStateDtoSchema, {
      params: { action },
      body: { expected_status: ACTION_FROM[action] },
    }),
  );
}

export async function getAdminVoters(params: {
  q: string;
  page: number;
  signal?: AbortSignal;
}): Promise<AdminVotersPage> {
  const search = new URLSearchParams({
    page: String(params.page),
    per_page: String(ADMIN.votersPageSize),
  });
  if (params.q) search.set('search', params.q);
  const dto = await call('getAdminVoters', adminVotersDtoSchema, {
    query: search,
    ...(params.signal ? { signal: params.signal } : {}),
  });
  const { voters } = dto;
  return {
    items: voters.items.map((v) => ({
      id: v.nim,
      name: v.name,
      email: v.email,
      status: v.has_voted ? 'VOTED' : 'NOT_VOTED',
    })),
    page: voters.page,
    pageSize: voters.per_page,
    total: voters.total,
    pageCount: Math.max(1, voters.total_pages),
    turnout: toTurnout(dto.turnout),
  };
}

export async function getAdminResults(): Promise<AdminResults> {
  const dto = await call('getAdminResults', adminResultsDtoSchema);
  return {
    election: toElection(dto),
    turnout: toTurnout(dto.results.turnout),
    results: toResults(dto.results.candidates, dto.results.total_votes),
    display: { activeScreen: SCREEN[dto.display_screen] },
    integrityOk: dto.results.integrity_ok,
  };
}

const SCREEN_WIRE = Object.fromEntries(
  Object.entries(SCREEN).map(([wire, screen]) => [screen, wire]),
) as Record<DisplayScreen, DisplayScreenDto>;

/**
 * Only result screens can be chosen; the others follow the voting status. `expected` is the screen
 * this committee member saw on air: if someone else changed it meanwhile the backend refuses
 * (DISPLAY_CHANGED -> STATE_CONFLICT) instead of overwriting their choice.
 */
export async function setDisplayScreen(
  screen: DisplayScreen,
  expected?: DisplayScreen,
): Promise<DisplayControl> {
  const wire = SCREEN_DTO[screen];
  if (!wire) throw new Error(`Screen ${screen} follows the voting status and cannot be chosen`);
  const dto = await call('setDisplayScreen', displayChangeDtoSchema, {
    body: { screen: wire, ...(expected ? { expected_screen: SCREEN_WIRE[expected] } : {}) },
  });
  return { activeScreen: SCREEN[dto.display_screen] };
}

export async function exportResults(): Promise<ExportFile> {
  const { blob, fileName } = await requestFile(API_ROUTES.exportResults.path, {
    timeoutMs: HTTP.exportTimeoutMs,
  });
  return { blob, fileName: fileName ?? ADMIN.exportFallbackName };
}

/* ---------- committee: candidates ---------- */

export async function getAdminCandidates(): Promise<Candidate[]> {
  const dto = await call('getAdminCandidates', candidatesDtoSchema);
  return dto.candidates.map(toCandidate).sort((a, b) => a.number - b.number);
}

export async function getAdminCandidate(id: string): Promise<Candidate> {
  return toCandidate(await call('getAdminCandidate', candidateDtoSchema, { params: { id } }));
}

export async function createCandidate(input: CandidateInput): Promise<Candidate> {
  return toCandidate(
    await call('createCandidate', candidateDtoSchema, { body: toCandidateBody(input) }),
  );
}

export async function updateCandidate(id: string, input: CandidateInput): Promise<Candidate> {
  return toCandidate(
    await call('updateCandidate', candidateDtoSchema, {
      params: { id },
      body: toCandidateBody(input),
    }),
  );
}

export async function deleteCandidate(id: string): Promise<void> {
  await send('deleteCandidate', { params: { id } });
}

export async function uploadCandidatePhoto(id: string, file: File): Promise<Candidate> {
  const form = new FormData();
  form.append(API_ROUTES.uploadCandidatePhoto.multipart, file);
  return toCandidate(
    await call('uploadCandidatePhoto', candidateDtoSchema, {
      params: { id },
      body: form,
      timeoutMs: HTTP.uploadTimeoutMs,
    }),
  );
}

export async function deleteCandidatePhoto(id: string): Promise<Candidate> {
  return toCandidate(await call('deleteCandidatePhoto', candidateDtoSchema, { params: { id } }));
}

/* ---------- public display ---------- */

export async function getDisplay(signal?: AbortSignal): Promise<DisplayPayload> {
  const dto = await call('getDisplay', displayPayloadDtoSchema, {
    skipAuthRedirect: true,
    ...(signal ? { signal } : {}),
  });
  return toDisplayPayload(dto);
}

/* ---------- live streams (committee panel, voter pages) ---------- */

export interface StreamSubscription<T> {
  onOpen: () => void;
  onEvent: (value: T) => void;
  onError: () => void;
}

/** Opens a registry stream. Null without EventSource; a message that does not parse is dropped. */
function subscribe<T>(
  route: { path: string; event: string },
  parse: (data: unknown) => T,
  handlers: StreamSubscription<T>,
): EventStreamHandle | null {
  return openEventStream(route.path, route.event, {
    onOpen: handlers.onOpen,
    onEvent: (data) => {
      let value: T;
      try {
        value = parse(JSON.parse(data));
      } catch {
        return;
      }
      handlers.onEvent(value);
    },
    onError: handlers.onError,
  });
}

/**
 * Live overview for the committee (`event: overview` on /admin/stream, the same body as
 * GET /admin/overview), sent whenever the state, the turnout or the screen on air changes.
 */
export const subscribeAdmin = (handlers: StreamSubscription<AdminOverview>) =>
  subscribe(
    API_ROUTES.streamAdmin,
    (data) => toAdminOverview(adminOverviewDtoSchema.parse(data)),
    handlers,
  );

/**
 * Election state for a signed-in voter (`event: election` on /election/stream, the same body as
 * GET /election), sent on connect and on every open / close / reopen.
 */
export const subscribeElection = (handlers: StreamSubscription<Election>) =>
  subscribe(
    API_ROUTES.streamElection,
    (data) => toElection(electionDtoSchema.parse(data)),
    handlers,
  );

export const DISPLAY_STREAM_PATH = API_ROUTES.streamDisplay.path;
export const DISPLAY_STREAM_EVENT = API_ROUTES.streamDisplay.event;

/** Parses one `event: display` message. Throws on a payload that does not match the contract. */
export function parseDisplayEvent(data: string): DisplayPayload {
  return toDisplayPayload(displayPayloadDtoSchema.parse(JSON.parse(data)));
}

export interface DisplaySubscription {
  onOpen: () => void;
  onPayload: (payload: DisplayPayload) => void;
  onError: () => void;
}

/**
 * Live display payloads over SSE. Null when the browser has no EventSource. A message that does
 * not match the contract is dropped (the next one, or the polling fallback, corrects it).
 */
export function subscribeDisplay(handlers: DisplaySubscription): EventStreamHandle | null {
  return openEventStream(DISPLAY_STREAM_PATH, DISPLAY_STREAM_EVENT, {
    onOpen: handlers.onOpen,
    onEvent: (data) => {
      let payload: DisplayPayload;
      try {
        payload = parseDisplayEvent(data);
      } catch {
        return;
      }
      handlers.onPayload(payload);
    },
    onError: handlers.onError,
  });
}
