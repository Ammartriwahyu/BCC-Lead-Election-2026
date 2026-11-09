/**
 * MSW request handlers implementing the ASSUMED contract (docs/API_CONTRACT.md).
 * Executed server-side by src/app/api/[...path]/route.ts and by msw/node in Vitest.
 */
import { delay, http, HttpResponse } from 'msw';
import { type z } from 'zod';

import { ADMIN, SESSION_COOKIES } from '@/config/constants';
import {
  displayBodySchema,
  electionActionBodySchema,
  electionActionSchema,
  signInBodySchema,
  voteBodySchema,
  type CandidateTallyDto,
  type DisplayPayloadDto,
  type ElectionDto,
  type VoterMeDto,
} from '@/lib/api/schemas';
import type { ElectionState, ErrorCode } from '@/lib/api/types';
import { isScreenAllowed } from '@/lib/utils/display-screens';

import {
  findMemberByEmail,
  getDb,
  recordVote,
  resetDb,
  setElectionState,
  voterCount,
  votesReceived,
  type MemberRecord,
  type MockDb,
} from './db';
import { applyScenario, scenarioBodySchema } from './scenarios';

const API = '*/api';

/** Simulated latency so loading and Submitting states are visible. */
export const MOCK_LATENCY = { defaultMs: 120, submitMs: 700, signInMs: 300 } as const;

/* ---------- helpers ---------- */

function error(
  status: number,
  code: ErrorCode,
  field?: string,
): HttpResponse<{ error: { code: ErrorCode; field?: string } }> {
  return HttpResponse.json({ error: { code, ...(field ? { field } : {}) } }, { status });
}

function sessionCookie(name: string, token: string, request: Request, maxAge?: number): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  const age = maxAge === undefined ? '' : `; Max-Age=${maxAge}`;
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}${age}`;
}

function newToken(): string {
  return crypto.randomUUID();
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function voterFromCookies(db: MockDb, cookies: Record<string, string>): MemberRecord | null {
  const token = cookies[SESSION_COOKIES.voter];
  if (!token) return null;
  const session = db.sessions.get(token);
  if (session?.role !== 'voter') return null;
  return db.members.get(session.userId) ?? null;
}

function isAdmin(db: MockDb, cookies: Record<string, string>): boolean {
  const token = cookies[SESSION_COOKIES.admin];
  return Boolean(token && db.sessions.get(token)?.role === 'admin');
}

const meDto = (m: MemberRecord): VoterMeDto => ({
  id: m.id,
  name: m.name,
  email: m.email,
  status: m.status,
  submittedAt: m.submittedAt,
});

const electionDto = (db: MockDb): ElectionDto => ({ ...db.election });

function tallies(db: MockDb): CandidateTallyDto[] {
  return db.candidates.map((c) => ({
    candidateId: c.id,
    number: c.number,
    name: c.name,
    major: c.major,
    classYear: c.classYear,
    photoUrl: c.photoUrl,
    votes: db.tallies.get(c.id) ?? 0,
  }));
}

const totals = (db: MockDb) => ({
  votesReceived: votesReceived(db),
  registeredVoters: voterCount(db),
});

function displayPayload(db: MockDb): DisplayPayloadDto {
  const { activeScreen: screen, version } = db.display;
  switch (screen) {
    case 'OPENS_SOON':
      return {
        screen,
        version,
        candidates: db.candidates.map(({ number, name, photoUrl }) => ({ number, name, photoUrl })),
      };
    case 'VOTING_OPEN':
    case 'VOTING_CLOSED':
    case 'WINNER_REVEAL':
      return { screen, version, totals: totals(db) };
    case 'FINAL_RESULTS':
    case 'MOST_VOTES':
      return {
        screen,
        version,
        totals: totals(db),
        candidates: tallies(db).map(({ candidateId: _omit, ...rest }) => rest),
      };
  }
}

const TRANSITIONS: Record<
  z.infer<typeof electionActionSchema>,
  { from: ElectionState; to: ElectionState }
> = {
  open: { from: 'NOT_STARTED', to: 'OPEN' },
  close: { from: 'OPEN', to: 'CLOSED' },
  reopen: { from: 'CLOSED', to: 'OPEN' },
};

/* ---------- handlers ---------- */

export const handlers = [
  /* ----- voter auth ----- */
  http.post(`${API}/auth/voter/sign-in`, async ({ request }) => {
    await delay(MOCK_LATENCY.signInMs);
    const db = getDb();
    const body = signInBodySchema.safeParse(await readJson(request));
    if (!body.success) return error(422, 'VALIDATION');
    const member = findMemberByEmail(db, body.data.email);
    if (!member) return error(403, 'NOT_A_VOTER', 'email');
    if (member.password !== body.data.password) return error(401, 'INVALID_CREDENTIALS');
    if (!member.isVoter) return error(403, 'NOT_A_VOTER', 'email');

    const token = newToken();
    db.sessions.set(token, { role: 'voter', userId: member.id });
    return HttpResponse.json(
      { voter: meDto(member), election: electionDto(db) },
      { headers: { 'Set-Cookie': sessionCookie(SESSION_COOKIES.voter, token, request) } },
    );
  }),

  http.post(`${API}/auth/sign-out`, ({ request, cookies }) => {
    const token = cookies[SESSION_COOKIES.voter];
    if (token) getDb().sessions.delete(token);
    return new HttpResponse(null, {
      status: 204,
      headers: { 'Set-Cookie': sessionCookie(SESSION_COOKIES.voter, '', request, 0) },
    });
  }),

  http.get(`${API}/me`, async ({ cookies }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const member = voterFromCookies(getDb(), cookies);
    if (!member) return error(401, 'UNAUTHORIZED');
    return HttpResponse.json(meDto(member));
  }),

  http.get(`${API}/election`, () => HttpResponse.json(electionDto(getDb()))),

  /* ----- candidates ----- */
  http.get(`${API}/candidates`, async ({ cookies }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    if (!voterFromCookies(db, cookies)) return error(401, 'UNAUTHORIZED');
    return HttpResponse.json({ items: db.candidates });
  }),

  http.get(`${API}/candidates/:id`, async ({ params, cookies }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    if (!voterFromCookies(db, cookies)) return error(401, 'UNAUTHORIZED');
    const candidate = db.candidates.find((c) => c.id === params.id);
    if (!candidate) return error(404, 'NOT_FOUND');
    return HttpResponse.json(candidate);
  }),

  /* ----- vote ----- */
  http.post(`${API}/votes`, async ({ request, cookies }) => {
    const db = getDb();
    db.voteRequests += 1;
    await delay(MOCK_LATENCY.submitMs);

    const member = voterFromCookies(db, cookies);
    if (!member) return error(401, 'UNAUTHORIZED');

    const key = request.headers.get('Idempotency-Key');
    if (!key) return error(400, 'VALIDATION');
    const replay = db.idempotency.get(key);
    if (replay) {
      if (replay.memberId !== member.id) return error(422, 'VALIDATION');
      return HttpResponse.json({ submittedAt: replay.submittedAt }, { status: 200 });
    }

    if (db.submitFault === 'close-on-submit') {
      db.submitFault = 'none';
      setElectionState(db, 'CLOSED');
    }
    if (db.election.state === 'NOT_STARTED') return error(409, 'VOTING_NOT_OPEN');
    if (db.election.state === 'CLOSED') return error(409, 'VOTING_CLOSED');
    if (member.status === 'VOTED') return error(409, 'ALREADY_VOTED');

    const body = voteBodySchema.safeParse(await readJson(request));
    if (!body.success || !db.candidates.some((c) => c.id === body.data.candidateId))
      return error(422, 'VALIDATION');

    if (db.submitFault === 'fail-once') {
      db.submitFault = 'none';
      return error(503, 'UNKNOWN');
    }

    // Vote and voted flag are stored together (one "transaction").
    const submittedAt = recordVote(db, member, body.data.candidateId);
    db.idempotency.set(key, { memberId: member.id, submittedAt });

    if (db.submitFault === 'lost-response-once') {
      db.submitFault = 'none';
      return error(503, 'UNKNOWN');
    }
    return HttpResponse.json({ submittedAt }, { status: 201 });
  }),

  /* ----- admin auth ----- */
  http.post(`${API}/admin/auth/sign-in`, async ({ request }) => {
    await delay(MOCK_LATENCY.signInMs);
    const db = getDb();
    const body = signInBodySchema.safeParse(await readJson(request));
    if (!body.success) return error(422, 'VALIDATION');
    const admin = db.committee.find((a) => a.email === body.data.email.trim().toLowerCase());
    if (admin?.password !== body.data.password) return error(401, 'INVALID_CREDENTIALS');

    const token = newToken();
    db.sessions.set(token, { role: 'admin', userId: admin.id });
    return HttpResponse.json(
      { admin: { id: admin.id, name: admin.name, email: admin.email } },
      { headers: { 'Set-Cookie': sessionCookie(SESSION_COOKIES.admin, token, request) } },
    );
  }),

  http.post(`${API}/admin/auth/sign-out`, ({ request, cookies }) => {
    const token = cookies[SESSION_COOKIES.admin];
    if (token) getDb().sessions.delete(token);
    return new HttpResponse(null, {
      status: 204,
      headers: { 'Set-Cookie': sessionCookie(SESSION_COOKIES.admin, '', request, 0) },
    });
  }),

  http.get(`${API}/admin/me`, ({ cookies }) => {
    const db = getDb();
    const token = cookies[SESSION_COOKIES.admin];
    const session = token ? db.sessions.get(token) : undefined;
    const admin =
      session?.role === 'admin' ? db.committee.find((a) => a.id === session.userId) : undefined;
    if (!admin) return error(401, 'UNAUTHORIZED');
    return HttpResponse.json({ admin: { id: admin.id, name: admin.name, email: admin.email } });
  }),

  /* ----- admin data ----- */
  http.get(`${API}/admin/overview`, async ({ cookies }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    if (!isAdmin(db, cookies)) return error(401, 'UNAUTHORIZED');
    return HttpResponse.json({
      election: electionDto(db),
      registeredVoters: voterCount(db),
      votesReceived: votesReceived(db),
      display: db.display,
    });
  }),

  http.post(`${API}/admin/election/:action`, async ({ request, params, cookies }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    if (!isAdmin(db, cookies)) return error(401, 'UNAUTHORIZED');
    const action = electionActionSchema.safeParse(params.action);
    const body = electionActionBodySchema.safeParse(await readJson(request));
    if (!action.success || !body.success) return error(422, 'VALIDATION');

    const transition = TRANSITIONS[action.data];
    if (db.election.state !== body.data.expectedState || db.election.state !== transition.from) {
      return error(409, 'STATE_CONFLICT');
    }
    setElectionState(db, transition.to);
    return HttpResponse.json(electionDto(db));
  }),

  http.get(`${API}/admin/voters`, async ({ request, cookies }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    if (!isAdmin(db, cookies)) return error(401, 'UNAUTHORIZED');
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);

    const all = [...db.members.values()]
      .filter((m) => m.isVoter)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
    const pageSize = ADMIN.votersPageSize;
    const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
    const page = Math.min(
      Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1),
      pageCount,
    );

    return HttpResponse.json({
      items: all
        .slice((page - 1) * pageSize, page * pageSize)
        .map(({ id, name, email, status }) => ({ id, name, email, status })),
      page,
      pageSize,
      total: all.length,
      registeredVoters: voterCount(db),
      votesReceived: votesReceived(db),
      election: electionDto(db),
    });
  }),

  http.get(`${API}/admin/results`, async ({ cookies }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    if (!isAdmin(db, cookies)) return error(401, 'UNAUTHORIZED');
    // Candidate totals never leave the server while voting is not closed.
    if (db.election.state !== 'CLOSED') return error(403, 'RESULTS_LOCKED');
    return HttpResponse.json({
      election: electionDto(db),
      registeredVoters: voterCount(db),
      candidates: tallies(db),
      display: db.display,
    });
  }),

  http.put(`${API}/admin/display`, async ({ request, cookies }) => {
    await delay(MOCK_LATENCY.defaultMs);
    const db = getDb();
    if (!isAdmin(db, cookies)) return error(401, 'UNAUTHORIZED');
    const body = displayBodySchema.safeParse(await readJson(request));
    if (!body.success) return error(422, 'VALIDATION');
    if (body.data.expectedVersion !== db.display.version) return error(409, 'STATE_CONFLICT');
    if (!isScreenAllowed(body.data.screen, db.election.state)) return error(409, 'STATE_CONFLICT');
    db.display = { activeScreen: body.data.screen, version: db.display.version + 1 };
    return HttpResponse.json(db.display);
  }),

  /* ----- public display ----- */
  http.get(`${API}/display`, () => HttpResponse.json(displayPayload(getDb()))),

  /* ----- mock-only control endpoints ----- */
  http.post(`${API}/__mock/scenario`, async ({ request }) => {
    const body = scenarioBodySchema.safeParse(await readJson(request));
    if (!body.success) return error(422, 'VALIDATION');
    const db = applyScenario(body.data.scenario, body.data.data ?? {});
    return HttpResponse.json({
      scenario: body.data.scenario,
      options: db.options,
      election: electionDto(db),
    });
  }),

  http.post(`${API}/__mock/reset`, () => {
    const db = resetDb();
    return HttpResponse.json({ options: db.options, election: electionDto(db) });
  }),

  http.get(`${API}/__mock/state`, () => {
    const db = getDb();
    return HttpResponse.json({
      options: db.options,
      election: electionDto(db),
      display: db.display,
      registeredVoters: voterCount(db),
      votesReceived: votesReceived(db),
      voteRequests: db.voteRequests,
      submitFault: db.submitFault,
    });
  }),
];
