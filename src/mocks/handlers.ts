/**
 * Mock backend: MSW handlers implementing the backend doc "API Pilketum BCC" (docs/API_CONTRACT.md).
 * Bearer tokens, snake_case JSON, the same error codes and statuses. Paths come from the registry in
 * lib/api/contract.ts (contract.test.ts checks every backend entry has a handler).
 *
 * The browser never calls these directly: the BFF (lib/bff) forwards to them in-process
 * (src/app/api/[...path]/route.ts in mock builds, src/mocks/node.ts in Vitest).
 */
import { delay, http, HttpResponse, type DefaultBodyType, type PathParams } from 'msw';
import type * as z from 'zod/mini';

import { ENDPOINTS, routePattern, type EndpointName } from '@/lib/api/contract';
import {
  adminLoginBodySchema,
  candidateBodySchema,
  displayBodySchema,
  electionActionBodySchema,
  otpBodySchema,
  selectableScreenWireSchema,
  voteBodySchema,
  voterLoginBodySchema,
  type CandidateDto,
  type CandidateResultDto,
  type DisplayPayloadDto,
  type DisplayScreenDto,
  type TurnoutDto,
  type VoterDto,
} from '@/lib/api/schemas';

import {
  findMember,
  getDb,
  isComplete,
  recordVote,
  resetDb,
  setElectionStatus,
  storePhoto,
  totalBallots,
  voterCount,
  votesReceived,
  type CandidateRecord,
  type MemberRecord,
  type MockDb,
} from './db';
import { DEMO_OTP_CODE, DEMO_OTP_DEVICES } from './fixtures';
import { readMultipartFile } from './multipart';
import { applyScenario, scenarioBodySchema } from './scenarios';

const API = '*/api';

/** The registry path of an endpoint as an MSW pattern on any origin, e.g. `/admin/candidates/:id`. */
export const route = (name: EndpointName): string => `${API}${routePattern(ENDPOINTS[name].path)}`;

/** Simulated latency so loading and Submitting states are visible. */
export const MOCK_LATENCY = { defaultMs: 120, submitMs: 700, signInMs: 300 } as const;

/** Mock SSE: how often the stream checks the database, sends a keep-alive, and asks clients to wait before reconnecting. */
export const MOCK_STREAM = { tickMs: 500, keepAliveMs: 15_000, retryMs: 3_000 } as const;

/** Failed sign-ins per username before RATE_LIMITED, and the Retry-After it sends. */
export const MOCK_RATE_LIMIT = { attempts: 5, retryAfterSeconds: 30 } as const;

const SESSION_TTL_MS = { voter: 2 * 60 * 60 * 1000, admin: 12 * 60 * 60 * 1000 } as const;
const OTP_FLOW_TTL_MS = 5 * 60 * 1000;
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const NAME_MAX = 100;
const VISION_MAX = 280;
const MISSION_MAX = 200;
const MISSIONS_MAX = 5;
const BALLOT_NUMBERS = [1, 2, 3];
const REQUIRED_CANDIDATES = 3;
const ONE_DECIMAL = 10;
const YEAR_RANGE = { min: 1990, max: 2100 } as const;

type ErrorResponse = HttpResponse<Record<string, unknown>>;

/* ---------- helpers ---------- */

function error(
  status: number,
  code: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): ErrorResponse {
  const { message, fields, ...rest } = extra;
  return HttpResponse.json(
    {
      error: {
        code,
        message: typeof message === 'string' ? message : code,
        ...(fields ? { fields } : {}),
      },
      ...rest,
    },
    { status, headers },
  );
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function newToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().slice(0, 11);
}

type Role = 'voter' | 'admin';

const isResponse = (value: unknown): value is ErrorResponse => value instanceof Response;

/** Bearer token -> session of one of `roles`, or the error response to return. */
function authorize(
  db: MockDb,
  request: Request,
  roles: readonly Role[],
): { userId: string; role: Role } | ErrorResponse {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const session = token ? db.sessions.get(token) : undefined;
  if (!session || session.expiresAt < Date.now()) return error(401, 'UNAUTHORIZED');
  if (!roles.includes(session.role)) return error(403, 'FORBIDDEN');
  return { userId: session.userId, role: session.role };
}

function startSession(db: MockDb, role: Role, userId: string) {
  const token = newToken();
  const expiresAt = Date.now() + SESSION_TTL_MS[role];
  db.sessions.set(token, { role, userId, expiresAt });
  return { token, expires_at: new Date(expiresAt).toISOString() };
}

const percent = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 100 * ONE_DECIMAL) / ONE_DECIMAL;

function turnoutDto(db: MockDb): TurnoutDto {
  const registered = voterCount(db);
  const voted = votesReceived(db);
  return { registered, voted, not_voted: registered - voted, percent: percent(voted, registered) };
}

const voterDto = (m: MemberRecord): VoterDto => ({
  nim: m.nim,
  name: m.name,
  email: m.email,
  class_year: m.classYear,
  study_program: m.studyProgram,
  department: m.department,
  has_voted: m.hasVoted,
  voted_at: m.votedAt,
});

const photoUrl = (c: CandidateRecord) => (c.photo ? `/api/__mock/uploads/${c.photo.file}` : null);

const candidateDto = (
  c: CandidateRecord,
): CandidateDto & { created_at: string; updated_at: string } => ({
  id: c.id,
  ballot_number: c.ballotNumber,
  full_name: c.fullName,
  study_program: c.studyProgram,
  class_year: c.classYear,
  vision: c.vision,
  missions: c.missions,
  photo_url: photoUrl(c),
  created_at: c.createdAt,
  updated_at: c.updatedAt,
});

const sortedCandidates = (db: MockDb) =>
  [...db.candidates].sort((a, b) => a.ballotNumber - b.ballotNumber);

const lineup = (db: MockDb) =>
  sortedCandidates(db).map((c) => ({
    id: c.id,
    ballot_number: c.ballotNumber,
    full_name: c.fullName,
    study_program: c.studyProgram,
    class_year: c.classYear,
    photo_url: photoUrl(c),
  }));

/** Ranked results (shared rank 1, 1, 3), shares in percent with 1 decimal. */
function resultRows(db: MockDb): CandidateResultDto[] {
  const total = totalBallots(db);
  const rows = sortedCandidates(db)
    .map((c) => ({ c, votes: db.tallies.get(c.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes || a.c.ballotNumber - b.c.ballotNumber);
  return rows.map(({ c, votes }) => ({
    id: c.id,
    ballot_number: c.ballotNumber,
    full_name: c.fullName,
    study_program: c.studyProgram,
    class_year: c.classYear,
    photo_url: photoUrl(c),
    votes,
    share: percent(votes, total),
    rank: 1 + rows.filter((r) => r.votes > votes).length,
  }));
}

const topTied = (rows: readonly CandidateResultDto[]) =>
  rows.filter((r) => r.rank === 1 && r.votes > 0).length > 1;

function displayPayload(
  db: MockDb,
  screen: DisplayScreenDto = db.displayScreen,
): DisplayPayloadDto {
  const status = db.status;
  const turnout = turnoutDto(db);
  const total = totalBallots(db);
  switch (screen) {
    case 'voting_opens_soon':
      return { screen, status, candidates: lineup(db) };
    case 'voting_open':
    case 'voting_closed':
      return { screen, status, turnout };
    case 'winner_suspense':
      return { screen, status, turnout, total_votes: total, candidates: lineup(db) };
    case 'final_results': {
      const results = resultRows(db);
      return { screen, status, turnout, total_votes: total, top_tied: topTied(results), results };
    }
    case 'most_votes': {
      const results = resultRows(db);
      const winners = total === 0 ? [] : results.filter((r) => r.rank === 1);
      return { screen, status, turnout, total_votes: total, top_tied: topTied(results), winners };
    }
  }
}

const overviewDto = (db: MockDb) => ({
  status: db.status,
  display_screen: db.displayScreen,
  opened_at: db.openedAt,
  closed_at: db.closedAt,
  candidates: db.candidates.length,
  turnout: turnoutDto(db),
  candidates_locked: db.everOpened,
});

const electionStateDto = (db: MockDb) => ({
  status: db.status,
  display_screen: db.displayScreen,
  opened_at: db.openedAt,
  closed_at: db.closedAt,
});

/** SSE response that sends `event` with `payload()` on connect and whenever it changes. */
function eventStream(event: string, payload: () => unknown): HttpResponse<ReadableStream> {
  const encoder = new TextEncoder();
  let tick: ReturnType<typeof setInterval> | undefined;
  let keepAlive: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    clearInterval(tick);
    clearInterval(keepAlive);
  };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let last = '';
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          stop(); // client went away
        }
      };
      const push = () => {
        const data = JSON.stringify(payload());
        if (data === last) return;
        last = data;
        send(`event: ${event}\ndata: ${data}\n\n`);
      };
      send(`retry: ${MOCK_STREAM.retryMs}\n\n`);
      push();
      tick = setInterval(push, MOCK_STREAM.tickMs);
      keepAlive = setInterval(() => {
        send(': keep-alive\n\n');
      }, MOCK_STREAM.keepAliveMs);
    },
    cancel: stop,
  });
  return new HttpResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

/** RATE_LIMITED after too many failed sign-ins for one username. */
function rateLimited(db: MockDb, key: string): ErrorResponse | null {
  if ((db.failedLogins.get(key) ?? 0) < MOCK_RATE_LIMIT.attempts) return null;
  return error(
    429,
    'RATE_LIMITED',
    { message: 'Too many attempts. Try again later.' },
    { 'Retry-After': String(MOCK_RATE_LIMIT.retryAfterSeconds) },
  );
}

function failLogin(db: MockDb, key: string): ErrorResponse {
  db.failedLogins.set(key, (db.failedLogins.get(key) ?? 0) + 1);
  return error(401, 'INVALID_CREDENTIALS');
}

function voterLoginSuccess(db: MockDb, member: MemberRecord) {
  return HttpResponse.json({
    ...startSession(db, 'voter', member.nim),
    voter: voterDto(member),
    election: { status: db.status },
  });
}

function otpChallenge(db: MockDb, member: MemberRecord) {
  const flow = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  db.otpFlows.set(flow, { nim: member.nim, expiresAt: Date.now() + OTP_FLOW_TTL_MS });
  return { flow, devices: DEMO_OTP_DEVICES };
}

type CandidateBody = z.infer<typeof candidateBodySchema>;

/** Backend validation rules for a candidate body. Returns the cleaned body or the error. */
function validateCandidate(
  db: MockDb,
  body: unknown,
  ownId: number | null,
): { data: CandidateBody } | ErrorResponse {
  const parsed = candidateBodySchema.safeParse(body);
  if (!parsed.success) return error(400, 'BAD_REQUEST');
  const data = {
    ...parsed.data,
    missions: parsed.data.missions.map((m) => m.trim()).filter(Boolean),
  };
  const fields: Record<string, string> = {};
  const text = `required, max ${NAME_MAX} characters`;
  if (!data.full_name.trim() || data.full_name.length > NAME_MAX) fields.full_name = text;
  if (!data.study_program.trim() || data.study_program.length > NAME_MAX)
    fields.study_program = text;
  if (data.class_year < YEAR_RANGE.min || data.class_year > YEAR_RANGE.max)
    fields.class_year = 'invalid year';
  if (!data.vision.trim() || data.vision.length > VISION_MAX)
    fields.vision = `required, max ${VISION_MAX} characters`;
  if (
    data.missions.length < 1 ||
    data.missions.length > MISSIONS_MAX ||
    data.missions.some((m) => m.length > MISSION_MAX)
  )
    fields.missions = `1 to ${MISSIONS_MAX} points required`;
  if (!BALLOT_NUMBERS.includes(data.ballot_number)) fields.ballot_number = '1 to 3';
  if (Object.keys(fields).length > 0)
    return error(422, 'VALIDATION_FAILED', { message: 'Some fields are invalid.', fields });
  if (db.candidates.some((c) => c.ballotNumber === data.ballot_number && c.id !== ownId))
    return error(409, 'BALLOT_NUMBER_TAKEN');
  return { data };
}

const candidatesLocked = (db: MockDb) => db.everOpened || db.status !== 'not_started';

const findCandidate = (db: MockDb, id: unknown) => db.candidates.find((c) => c.id === Number(id));

function isImage(bytes: Uint8Array, type: string): boolean {
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return (type === 'image/png' && png) || (type === 'image/jpeg' && jpg);
}

/** Admin endpoint on an existing, still editable candidate. */
function editableCandidate(
  db: MockDb,
  request: Request,
  id: unknown,
): CandidateRecord | ErrorResponse {
  const auth = authorize(db, request, ['admin']);
  if (isResponse(auth)) return auth;
  const candidate = findCandidate(db, id);
  if (!candidate) return error(404, 'NOT_FOUND');
  if (candidatesLocked(db)) return error(409, 'CANDIDATES_LOCKED');
  return candidate;
}

function applyBody(candidate: CandidateRecord, body: CandidateBody): void {
  candidate.ballotNumber = body.ballot_number;
  candidate.fullName = body.full_name.trim();
  candidate.studyProgram = body.study_program.trim();
  candidate.classYear = body.class_year;
  candidate.vision = body.vision.trim();
  candidate.missions = body.missions;
  candidate.updatedAt = new Date().toISOString();
}

/* ---------- handlers ---------- */

export const handlers = [
  /* ----- public ----- */
  http.get(route('getHealth'), () => HttpResponse.json({ ok: true })),

  http.get(route('getElection'), () =>
    HttpResponse.json({ status: getDb().status, server_time: new Date().toISOString() }),
  ),

  http.get(route('getDisplay'), () => HttpResponse.json(displayPayload(getDb()))),

  http.get(route('streamDisplay'), () =>
    eventStream(ENDPOINTS.streamDisplay.stream.event, () => displayPayload(getDb())),
  ),

  /* ----- voter auth ----- */
  http.post(route('voterSignIn'), async ({ request }) => {
    await delay(MOCK_LATENCY.signInMs);
    const db = getDb();
    const body = voterLoginBodySchema.safeParse(await readJson(request));
    if (!body.success || !body.data.username.trim() || !body.data.password)
      return error(400, 'BAD_REQUEST');
    const username = body.data.username.trim().toLowerCase();
    const limited = rateLimited(db, username);
    if (limited) return limited;

    const member = findMember(db, username);
    if (member?.sso === 'down') return error(502, 'SSO_UNAVAILABLE');
    if (member?.sso === 'busy') return error(503, 'SSO_BUSY');
    if (member?.password !== body.data.password) return failLogin(db, username);
    db.failedLogins.delete(username);
    if (!member.isVoter) return error(403, 'NOT_REGISTERED');
    if (member.sso === 'otp') {
      return HttpResponse.json({ otp_required: true, ...otpChallenge(db, member) });
    }
    return voterLoginSuccess(db, member);
  }),

  http.post(route('voterOtp'), async ({ request }) => {
    await delay(MOCK_LATENCY.signInMs);
    const db = getDb();
    const body = otpBodySchema.safeParse(await readJson(request));
    if (!body.success) return error(400, 'BAD_REQUEST');
    const flow = db.otpFlows.get(body.data.flow);
    db.otpFlows.delete(body.data.flow);
    if (!flow || flow.expiresAt < Date.now()) return error(401, 'OTP_EXPIRED');
    const member = db.members.get(flow.nim);
    if (!member) return error(401, 'OTP_EXPIRED');
    if (body.data.code !== DEMO_OTP_CODE) {
      return error(401, 'OTP_INVALID', {
        message: "That code isn't right. Try again.",
        ...otpChallenge(db, member),
      });
    }
    return voterLoginSuccess(db, member);
  }),

  http.post(route('voterSignOut'), ({ request }) => {
    const header = request.headers.get('Authorization') ?? '';
    getDb().sessions.delete(header.replace(/^Bearer /, ''));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(route('getMe'), async ({ request }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const auth = authorize(db, request, ['voter']);
    if (isResponse(auth)) return auth;
    const member = db.members.get(auth.userId);
    if (!member) return error(401, 'UNAUTHORIZED');
    return HttpResponse.json({ voter: voterDto(member), election: { status: db.status } });
  }),

  http.get<PathParams, DefaultBodyType, ReadableStream | Record<string, unknown>>(
    route('streamElection'),
    ({ request }) => {
      const auth = authorize(getDb(), request, ['voter']);
      if (isResponse(auth)) return auth;
      // Status only (server_time is optional): an event goes out only when the state changes.
      return eventStream(ENDPOINTS.streamElection.stream.event, () => ({ status: getDb().status }));
    },
  ),

  http.get(route('getCandidates'), async ({ request }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const auth = authorize(db, request, ['voter', 'admin']);
    if (isResponse(auth)) return auth;
    return HttpResponse.json({ candidates: sortedCandidates(db).map(candidateDto) });
  }),

  http.post(route('submitVote'), async ({ request }) => {
    const db = getDb();
    db.voteRequests += 1;
    await delay(MOCK_LATENCY.submitMs);
    const auth = authorize(db, request, ['voter']);
    if (isResponse(auth)) return auth;
    const member = db.members.get(auth.userId);
    if (!member) return error(401, 'UNAUTHORIZED');

    if (db.submitFault === 'close-on-submit') {
      db.submitFault = 'none';
      setElectionStatus(db, 'closed');
    }
    if (db.status !== 'open') return error(409, 'VOTING_NOT_OPEN');
    if (member.hasVoted) return error(409, 'ALREADY_VOTED');

    const body = voteBodySchema.safeParse(await readJson(request));
    if (!body.success) return error(400, 'BAD_REQUEST');
    const candidate = findCandidate(db, body.data.candidate_id);
    if (!candidate) return error(404, 'NOT_FOUND');

    if (db.submitFault === 'fail-once') {
      db.submitFault = 'none';
      return error(500, 'INTERNAL_ERROR');
    }
    // Ballot and "has voted" are stored together (one transaction).
    recordVote(db, member, candidate.id);
    if (db.submitFault === 'lost-response-once') {
      db.submitFault = 'none';
      return error(500, 'INTERNAL_ERROR');
    }
    return HttpResponse.json({ voted: true }, { status: 201 });
  }),

  /* ----- committee auth ----- */
  http.post(route('adminSignIn'), async ({ request }) => {
    await delay(MOCK_LATENCY.signInMs);
    const db = getDb();
    const body = adminLoginBodySchema.safeParse(await readJson(request));
    if (!body.success) return error(400, 'BAD_REQUEST');
    const username = body.data.username.trim().toLowerCase();
    const key = `admin:${username}`;
    const limited = rateLimited(db, key);
    if (limited) return limited;
    const admin = db.committee.find((a) => a.username === username);
    if (admin?.password !== body.data.password) return failLogin(db, key);
    db.failedLogins.delete(key);
    return HttpResponse.json({
      ...startSession(db, 'admin', admin.username),
      username: admin.username,
      display_name: admin.displayName,
    });
  }),

  http.get(route('getAdminMe'), ({ request }) => {
    const db = getDb();
    const auth = authorize(db, request, ['admin']);
    if (isResponse(auth)) return auth;
    const admin = db.committee.find((a) => a.username === auth.userId);
    return HttpResponse.json({ username: auth.userId, display_name: admin?.displayName });
  }),

  /* ----- committee data ----- */
  http.get(route('getAdminOverview'), async ({ request }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const auth = authorize(db, request, ['admin']);
    if (isResponse(auth)) return auth;
    return HttpResponse.json(overviewDto(db));
  }),

  http.get<PathParams, DefaultBodyType, ReadableStream | Record<string, unknown>>(
    route('streamAdmin'),
    ({ request }) => {
      const auth = authorize(getDb(), request, ['admin']);
      if (isResponse(auth)) return auth;
      return eventStream(ENDPOINTS.streamAdmin.stream.event, () => overviewDto(getDb()));
    },
  ),

  http.post(route('changeElectionState'), async ({ request, params }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const auth = authorize(db, request, ['admin']);
    if (isResponse(auth)) return auth;
    const action = String(params.action);
    // The body is optional; `expected_status` refuses a click made on a stale page.
    const raw = await readJson(request);
    const body = electionActionBodySchema.safeParse(raw ?? {});
    if (!body.success) return error(400, 'BAD_REQUEST');
    const expected = body.data.expected_status;
    if (expected !== undefined && expected !== db.status) return error(409, 'INVALID_STATE');
    if (action === 'open') {
      if (db.status !== 'not_started') return error(409, 'INVALID_STATE');
      if (db.candidates.length !== REQUIRED_CANDIDATES || !db.candidates.every(isComplete))
        return error(409, 'CANDIDATES_INCOMPLETE');
      setElectionStatus(db, 'open');
    } else if (action === 'close') {
      if (db.status !== 'open') return error(409, 'INVALID_STATE');
      setElectionStatus(db, 'closed');
    } else if (action === 'reopen') {
      if (db.status !== 'closed') return error(409, 'INVALID_STATE');
      setElectionStatus(db, 'open');
    } else {
      return error(404, 'NOT_FOUND');
    }
    return HttpResponse.json(electionStateDto(db));
  }),

  http.put(route('setDisplayScreen'), async ({ request }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const auth = authorize(db, request, ['admin']);
    if (isResponse(auth)) return auth;
    const body = displayBodySchema.safeParse(await readJson(request));
    if (!body.success) return error(422, 'INVALID_SCREEN');
    if (db.status !== 'closed') return error(409, 'RESULTS_LOCKED');
    const expected = body.data.expected_screen;
    if (expected !== undefined && expected !== db.displayScreen) {
      return error(409, 'DISPLAY_CHANGED', { display_screen: db.displayScreen });
    }
    db.displayScreen = body.data.screen;
    return HttpResponse.json({ status: db.status, display_screen: db.displayScreen });
  }),

  http.get(route('previewDisplay'), ({ request }) => {
    const db = getDb();
    const auth = authorize(db, request, ['admin']);
    if (isResponse(auth)) return auth;
    const param = new URL(request.url).searchParams.get('screen');
    if (param === null) return HttpResponse.json(displayPayload(db));
    const screen = selectableScreenWireSchema.safeParse(param);
    if (!screen.success) return error(422, 'INVALID_SCREEN');
    if (db.status !== 'closed') return error(409, 'RESULTS_LOCKED');
    return HttpResponse.json(displayPayload(db, screen.data));
  }),

  http.get(route('getAdminVoters'), async ({ request }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const auth = authorize(db, request, ['admin']);
    if (isResponse(auth)) return auth;
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
    const status = url.searchParams.get('status');
    const perPageParam = Number.parseInt(url.searchParams.get('per_page') ?? '10', 10);
    const perPage = Math.min(100, Math.max(1, Number.isFinite(perPageParam) ? perPageParam : 10));
    const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);

    const all = [...db.members.values()]
      .filter((m) => m.isVoter)
      .filter(
        (m) =>
          !search ||
          m.name.toLowerCase().includes(search) ||
          (m.email ?? '').includes(search) ||
          m.nim.includes(search),
      )
      .filter((m) => !status || (status === 'voted') === m.hasVoted)
      .sort((a, b) => a.name.localeCompare(b.name));
    const totalPages = Math.ceil(all.length / perPage);
    const page = Math.min(
      Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1),
      Math.max(1, totalPages),
    );

    return HttpResponse.json({
      voters: {
        items: all.slice((page - 1) * perPage, page * perPage).map((m) => ({
          nim: m.nim,
          name: m.name,
          email: m.email,
          department: m.department,
          class_year: m.classYear,
          has_voted: m.hasVoted,
        })),
        page,
        per_page: perPage,
        total: all.length,
        total_pages: totalPages,
      },
      turnout: turnoutDto(db),
    });
  }),

  http.get(route('getAdminResults'), async ({ request }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const auth = authorize(db, request, ['admin']);
    if (isResponse(auth)) return auth;
    // Totals per candidate for the committee once voting has opened: live while open, final
    // once closed (requested from the backend, BACKEND_QUESTIONS #14). Never before opening.
    if (db.status === 'not_started') return error(409, 'RESULTS_LOCKED');
    const candidates = resultRows(db);
    const total = totalBallots(db);
    return HttpResponse.json({
      status: db.status,
      display_screen: db.displayScreen,
      results: {
        total_votes: total,
        turnout: turnoutDto(db),
        candidates,
        leaders:
          total === 0 ? [] : candidates.filter((c) => c.rank === 1).map((c) => c.ballot_number),
        top_tied: topTied(candidates),
        integrity_ok: total === votesReceived(db),
      },
    });
  }),

  http.get(route('exportResults'), ({ request }) => {
    const db = getDb();
    const auth = authorize(db, request, ['admin']);
    if (isResponse(auth)) return auth;
    if (db.status !== 'closed') return error(409, 'RESULTS_LOCKED');
    // Mock file: the real backend builds an .xlsx with Summary, Results and Voters sheets.
    const rows = resultRows(db).map((r) => `${r.ballot_number}\t${r.full_name}\t${r.votes}`);
    return new HttpResponse(new TextEncoder().encode(['Ballot\tName\tVotes', ...rows].join('\n')), {
      headers: {
        'Content-Type': ENDPOINTS.exportResults.file.contentType,
        'Content-Disposition': 'attachment; filename="pilketum-bcc-2026-results.xlsx"',
      },
    });
  }),

  /* ----- committee: candidates ----- */
  http.get(route('getAdminCandidates'), async ({ request }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const auth = authorize(db, request, ['admin']);
    if (isResponse(auth)) return auth;
    return HttpResponse.json({ candidates: sortedCandidates(db).map(candidateDto) });
  }),

  http.get(route('getAdminCandidate'), async ({ request, params }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const auth = authorize(db, request, ['admin']);
    if (isResponse(auth)) return auth;
    const candidate = findCandidate(db, params.id);
    return candidate ? HttpResponse.json(candidateDto(candidate)) : error(404, 'NOT_FOUND');
  }),

  http.post(route('createCandidate'), async ({ request }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const auth = authorize(db, request, ['admin']);
    if (isResponse(auth)) return auth;
    if (candidatesLocked(db)) return error(409, 'CANDIDATES_LOCKED');
    const valid = validateCandidate(db, await readJson(request), null);
    if (isResponse(valid)) return valid;
    const now = new Date().toISOString();
    const record: CandidateRecord = {
      id: db.nextCandidateId,
      ballotNumber: 0,
      fullName: '',
      studyProgram: '',
      classYear: 0,
      vision: '',
      missions: [],
      photo: null,
      createdAt: now,
      updatedAt: now,
    };
    applyBody(record, valid.data);
    db.nextCandidateId += 1;
    db.candidates.push(record);
    db.tallies.set(record.id, 0);
    return HttpResponse.json(candidateDto(record), { status: 201 });
  }),

  http.put(route('updateCandidate'), async ({ request, params }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const candidate = editableCandidate(db, request, params.id);
    if (isResponse(candidate)) return candidate;
    const valid = validateCandidate(db, await readJson(request), candidate.id);
    if (isResponse(valid)) return valid;
    applyBody(candidate, valid.data);
    return HttpResponse.json(candidateDto(candidate));
  }),

  http.delete(route('deleteCandidate'), async ({ request, params }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const candidate = editableCandidate(db, request, params.id);
    if (isResponse(candidate)) return candidate;
    if (candidate.photo) db.photos.delete(candidate.photo.file);
    db.candidates = db.candidates.filter((c) => c.id !== candidate.id);
    db.tallies.delete(candidate.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.put(route('uploadCandidatePhoto'), async ({ request, params }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const candidate = editableCandidate(db, request, params.id);
    if (isResponse(candidate)) return candidate;
    const file = await readMultipartFile(request, ENDPOINTS.uploadCandidatePhoto.multipart);
    if (!file) return error(400, 'BAD_REQUEST');
    if (file.bytes.length > PHOTO_MAX_BYTES) return error(413, 'PHOTO_TOO_LARGE');
    const bytes = file.bytes;
    if (!isImage(bytes, file.type)) return error(422, 'PHOTO_INVALID');
    if (candidate.photo) db.photos.delete(candidate.photo.file);
    candidate.photo = storePhoto(db, bytes, file.type);
    candidate.updatedAt = new Date().toISOString();
    return HttpResponse.json(candidateDto(candidate));
  }),

  http.delete(route('deleteCandidatePhoto'), async ({ request, params }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    const candidate = editableCandidate(db, request, params.id);
    if (isResponse(candidate)) return candidate;
    if (candidate.photo) db.photos.delete(candidate.photo.file);
    candidate.photo = null;
    candidate.updatedAt = new Date().toISOString();
    return HttpResponse.json(candidateDto(candidate));
  }),

  /* ----- mock-only endpoints ----- */
  http.get(`${API}/__mock/uploads/:file`, ({ params }) => {
    const photo = getDb().photos.get(String(params.file));
    if (!photo) return error(404, 'NOT_FOUND');
    return new HttpResponse(photo.bytes, {
      headers: { 'Content-Type': photo.type, 'Cache-Control': 'public, max-age=3600, immutable' },
    });
  }),

  http.post(`${API}/__mock/scenario`, async ({ request }) => {
    const body = scenarioBodySchema.safeParse(await readJson(request));
    if (!body.success) return error(422, 'VALIDATION_FAILED');
    const db = applyScenario(body.data.scenario, body.data.data ?? {});
    return HttpResponse.json({
      scenario: body.data.scenario,
      options: db.options,
      status: db.status,
    });
  }),

  http.post(`${API}/__mock/reset`, () => {
    const db = resetDb();
    return HttpResponse.json({ options: db.options, status: db.status });
  }),

  http.get(`${API}/__mock/state`, () => {
    const db = getDb();
    return HttpResponse.json({
      options: db.options,
      status: db.status,
      displayScreen: db.displayScreen,
      registeredVoters: voterCount(db),
      votesReceived: votesReceived(db),
      voteRequests: db.voteRequests,
      submitFault: db.submitFault,
    });
  }),
];
