/**
 * Contract tests: lib/api endpoint functions -> BFF -> mock backend (msw/node). They pin the
 * backend doc ("API Pilketum BCC") as the mock implements it, and the DTO -> domain mapping.
 */
import { http, HttpResponse } from 'msw';

import {
  COMMITTEE_DISPLAY_NAME,
  DEMO_ACCOUNTS,
  DEMO_OTP_CODE,
  DEMO_PASSWORD,
  PRE_VOTED_AT,
} from '@/mocks/fixtures';
import { MOCK_RATE_LIMIT, route } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { applyScenario } from '@/mocks/scenarios';

import {
  adminSignIn,
  adminSignOut,
  changeElectionState,
  createCandidate,
  deleteCandidate,
  deleteCandidatePhoto,
  exportResults,
  getAdminCandidate,
  getAdminCandidates,
  getAdminMe,
  getAdminOverview,
  getAdminResults,
  getAdminVoters,
  getCandidates,
  getDisplay,
  getElection,
  getMe,
  parseDisplayEvent,
  setDisplayScreen,
  submitVote,
  updateCandidate,
  voterSignIn,
  voterSignOut,
  voterSubmitOtp,
} from './endpoints';
import type { CandidateInput, SignInResult, VoterSession } from './types';

const VOTER = { username: DEMO_ACCOUNTS.voter, password: DEMO_PASSWORD.voter };
const ADMIN = { username: DEMO_ACCOUNTS.committee, password: DEMO_PASSWORD.committee };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Uploads a photo through the BFF with a hand-built multipart body. jsdom's FormData cannot be sent
 * by Node's fetch (and Node's FormData rejects jsdom's Blob), so uploadCandidatePhoto itself is
 * covered by the browser e2e suite; this checks the BFF and the backend contract.
 */
async function upload(id: string, bytes: Uint8Array, type: string): Promise<Response> {
  const boundary = 'pilketum-test-boundary';
  const crlf = '\r\n';
  const head = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="photo"; filename="photo"',
    `Content-Type: ${type}`,
    '',
    '',
  ].join(crlf);
  const tail = `${crlf}--${boundary}--${crlf}`;
  const body = new Uint8Array([
    ...new TextEncoder().encode(head),
    ...bytes,
    ...new TextEncoder().encode(tail),
  ]);
  return fetch(new URL(`/api/admin/candidates/${id}/photo`, window.location.origin), {
    method: 'PUT',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
}

async function errorCode(response: Response): Promise<string> {
  const body = (await response.json()) as { error: { code: string } };
  return body.error.code;
}

function session(result: SignInResult): VoterSession {
  if (result.kind !== 'signed-in') throw new Error('expected a session');
  return result.session;
}

const signInVoter = async (username: string = VOTER.username) =>
  session(await voterSignIn(username, VOTER.password));

const input = (overrides: Partial<CandidateInput> = {}): CandidateInput => ({
  number: 3,
  name: 'New Candidate',
  major: 'Information Systems',
  classYear: 2024,
  vision: 'A vision.',
  missions: ['One', '  ', 'Two'],
  ...overrides,
});

afterEach(async () => {
  await voterSignOut();
  await adminSignOut();
});

describe('voter sign-in', () => {
  it('signs in by email or NIM and returns the voter and the voting status', async () => {
    const byEmail = await signInVoter();
    expect(byEmail.voter).toMatchObject({
      id: DEMO_ACCOUNTS.voterNim,
      email: VOTER.username,
      status: 'NOT_VOTED',
      submittedAt: null,
    });
    expect(byEmail.election.state).toBe('NOT_STARTED');
    await expect(getMe()).resolves.toMatchObject({ id: DEMO_ACCOUNTS.voterNim });
    await voterSignOut();
    await expect(signInVoter(DEMO_ACCOUNTS.voterNim)).resolves.toMatchObject({
      voter: { email: VOTER.username },
    });
  });

  it('maps wrong passwords, non-voters and SSO problems', async () => {
    await expect(voterSignIn(VOTER.username, 'nope')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    });
    await expect(voterSignIn('nobody@bcc.test', VOTER.password)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    await expect(voterSignIn(DEMO_ACCOUNTS.guest, VOTER.password)).rejects.toMatchObject({
      code: 'NOT_A_VOTER',
      status: 403,
    });
    await expect(voterSignIn(DEMO_ACCOUNTS.ssoDown, VOTER.password)).rejects.toMatchObject({
      code: 'SSO_UNAVAILABLE',
      status: 502,
    });
    await expect(voterSignIn(DEMO_ACCOUNTS.ssoBusy, VOTER.password)).rejects.toMatchObject({
      code: 'SSO_BUSY',
      status: 503,
    });
  });

  it('rate-limits repeated failures and passes Retry-After on', async () => {
    for (let i = 0; i < MOCK_RATE_LIMIT.attempts; i += 1) {
      await voterSignIn(VOTER.username, 'wrong').catch(() => undefined);
    }
    await expect(voterSignIn(VOTER.username, VOTER.password)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      retryAfterSeconds: MOCK_RATE_LIMIT.retryAfterSeconds,
    });
  });

  it('asks 2FA accounts for a code; a wrong code gives a new flow', async () => {
    const first = await voterSignIn(DEMO_ACCOUNTS.otp, VOTER.password);
    expect(first.kind).toBe('otp');
    if (first.kind !== 'otp') return;
    expect(first.challenge.devices.find((d) => d.isDefault)?.name).toBe('Google Authenticator');
    // Not signed in yet.
    await expect(getMe()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    const wrong = await voterSubmitOtp(first.challenge.flow, '000000').catch((e: unknown) => e);
    expect(wrong).toMatchObject({ code: 'OTP_INVALID' });
    const next = (wrong as { otp?: { flow: string } }).otp?.flow ?? '';
    expect(next).not.toBe(first.challenge.flow);

    // The used flow cannot be replayed.
    await expect(voterSubmitOtp(first.challenge.flow, DEMO_OTP_CODE)).rejects.toMatchObject({
      code: 'OTP_EXPIRED',
    });
    const signedIn = await voterSubmitOtp(next, DEMO_OTP_CODE, 'dev-authenticator');
    expect(signedIn.voter.email).toBe(DEMO_ACCOUNTS.otp);
    await expect(getMe()).resolves.toMatchObject({ email: DEMO_ACCOUNTS.otp });
  });

  it('reports the voted status and the vote time (voted_at) for voted@bcc.test', async () => {
    const voted = await signInVoter(DEMO_ACCOUNTS.voted);
    expect(voted.voter).toMatchObject({ status: 'VOTED', submittedAt: new Date(PRE_VOTED_AT) });
    await expect(getMe()).resolves.toMatchObject({ submittedAt: new Date(PRE_VOTED_AT) });
  });

  it('requires a session for /me and candidates, and ends it on sign-out', async () => {
    await expect(getMe()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(getCandidates()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await signInVoter();
    await voterSignOut();
    await expect(getMe()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('candidates (voter)', () => {
  it('lists candidates by ballot number with string ids and photos', async () => {
    await signInVoter();
    const candidates = await getCandidates();
    expect(candidates.map((c) => c.number)).toEqual([1, 2, 3]);
    expect(candidates[0]).toMatchObject({
      id: '1',
      name: 'Candidate Name 01',
      major: 'Information Systems',
      classYear: 2023,
    });
    expect(candidates[0]?.photoUrl).toMatch(/^\/api\/__mock\/uploads\//);
    expect(candidates[0]?.missions.length).toBeGreaterThan(0);
  });
});

describe('voting', () => {
  it('refuses votes before voting opens', async () => {
    await signInVoter();
    await expect(submitVote('1')).rejects.toMatchObject({ code: 'VOTING_NOT_OPEN', status: 409 });
  });

  it('stores one vote; a second one is ALREADY_VOTED', async () => {
    applyScenario('open');
    await signInVoter();
    const receipt = await submitVote('2');
    expect(receipt.submittedAt).toBeInstanceOf(Date);
    await expect(submitVote('2')).rejects.toMatchObject({ code: 'ALREADY_VOTED' });
    await expect(getMe()).resolves.toMatchObject({ status: 'VOTED' });
  });

  it('fails once without storing in the submit-fails scenario', async () => {
    applyScenario('submit-fails');
    await signInVoter();
    const error = await submitVote('1').catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'UNKNOWN', status: 500, isTransient: true });
    await expect(getMe()).resolves.toMatchObject({ status: 'NOT_VOTED' });
    await expect(submitVote('1')).resolves.toHaveProperty('submittedAt');
  });

  it('stores the vote but loses the response in submit-lost-response', async () => {
    applyScenario('submit-lost-response');
    await signInVoter();
    await expect(submitVote('1')).rejects.toMatchObject({ status: 500 });
    // has_voted tells the UI the vote is in; no second vote is possible.
    await expect(getMe()).resolves.toMatchObject({ status: 'VOTED' });
    await expect(submitVote('1')).rejects.toMatchObject({ code: 'ALREADY_VOTED' });
  });

  it('closes voting mid-vote in closed-mid-vote', async () => {
    applyScenario('closed-mid-vote');
    await signInVoter();
    await expect(submitVote('1')).rejects.toMatchObject({ code: 'VOTING_NOT_OPEN' });
    await expect(getElection()).resolves.toMatchObject({ state: 'CLOSED' });
  });

  it('rejects an unknown candidate', async () => {
    applyScenario('open');
    await signInVoter();
    await expect(submitVote('99')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('committee', () => {
  it('signs in by username; a voter session is not a committee session', async () => {
    await expect(adminSignIn(ADMIN.username, 'x')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    await signInVoter();
    await expect(getAdminOverview()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    const me = { username: ADMIN.username, displayName: COMMITTEE_DISPLAY_NAME };
    await expect(adminSignIn(ADMIN.username, ADMIN.password)).resolves.toEqual(me);
    await expect(getAdminMe()).resolves.toEqual(me);
  });

  it('opens, closes and reopens; a stale action is a STATE_CONFLICT', async () => {
    await adminSignIn(ADMIN.username, ADMIN.password);
    expect((await getAdminOverview()).candidatesLocked).toBe(false);
    await expect(changeElectionState('open')).resolves.toEqual({ state: 'OPEN' });
    // A second committee member clicking Open on a stale page.
    await expect(changeElectionState('open')).rejects.toMatchObject({ code: 'STATE_CONFLICT' });
    await expect(changeElectionState('close')).resolves.toEqual({ state: 'CLOSED' });
    await expect(changeElectionState('reopen')).resolves.toEqual({ state: 'OPEN' });
    const overview = await getAdminOverview();
    expect(overview).toMatchObject({
      candidatesLocked: true,
      display: { activeScreen: 'VOTING_OPEN' },
    });
  });

  it('refuses to open without three complete candidates', async () => {
    applyScenario('not-started', { candidateSet: 'missing-photo' });
    await adminSignIn(ADMIN.username, ADMIN.password);
    await expect(changeElectionState('open')).rejects.toMatchObject({
      code: 'CANDIDATES_INCOMPLETE',
    });
  });

  it('locks results before voting opens, live while open, export only once closed', async () => {
    applyScenario('not-started');
    await adminSignIn(ADMIN.username, ADMIN.password);
    await expect(getAdminResults()).rejects.toMatchObject({ code: 'RESULTS_LOCKED', status: 409 });
    await changeElectionState('open');
    // Live totals for the committee while voting is open; the export still waits.
    const live = await getAdminResults();
    expect(live.election.state).toBe('OPEN');
    expect(live.results.validVotes).toBe(live.turnout.votesReceived);
    await expect(exportResults()).rejects.toMatchObject({ code: 'RESULTS_LOCKED' });
    await changeElectionState('close');
    const results = await getAdminResults();
    expect(results.results.candidates).toHaveLength(3);
    expect(results.integrityOk).toBe(true);
    expect(results.turnout.votesReceived).toBe(results.results.validVotes);
    const file = await exportResults();
    expect(file.fileName).toBe('pilketum-bcc-2026-results.xlsx');
    expect(file.blob.size).toBeGreaterThan(0);
  });

  it('reports overview turnout without candidate totals', async () => {
    applyScenario('closed');
    await adminSignIn(ADMIN.username, ADMIN.password);
    const overview = await getAdminOverview();
    expect(overview.turnout.registeredVoters).toBe(139);
    expect(overview.turnout.votesReceived).toBe(Math.round(139 * 0.8));
    expect(overview.candidateCount).toBe(3);
    expect(JSON.stringify(overview)).not.toMatch(/votes"?:\s*\d+,"share/);
  });

  it('searches and paginates voters server-side', async () => {
    await adminSignIn(ADMIN.username, ADMIN.password);
    const first = await getAdminVoters({ q: '', page: 1 });
    expect(first.total).toBe(139);
    expect(first.items).toHaveLength(6);
    expect(first.pageCount).toBe(24);
    const last = await getAdminVoters({ q: '', page: 999 });
    expect(last.page).toBe(24);
    const search = await getAdminVoters({ q: 'member001', page: 1 });
    expect(search.items.map((v) => v.email)).toEqual(['member001@student.ub.ac.id']);
    const byNim = await getAdminVoters({ q: DEMO_ACCOUNTS.voterNim, page: 1 });
    expect(byNim.items.map((v) => v.name)).toEqual(['Demo Voter']);
    const none = await getAdminVoters({ q: 'zzz', page: 1 });
    expect(none.total).toBe(0);
    expect(none.items).toEqual([]);
    // Voter rows never carry a candidate.
    expect(Object.keys(first.items[0] ?? {})).toEqual(['id', 'name', 'email', 'status']);
  });

  it('puts result screens on air only while closed', async () => {
    applyScenario('open');
    await adminSignIn(ADMIN.username, ADMIN.password);
    await expect(setDisplayScreen('FINAL_RESULTS')).rejects.toMatchObject({
      code: 'RESULTS_LOCKED',
    });
    await changeElectionState('close');
    await expect(setDisplayScreen('FINAL_RESULTS')).resolves.toEqual({
      activeScreen: 'FINAL_RESULTS',
    });
    await expect(getAdminOverview()).resolves.toMatchObject({
      display: { activeScreen: 'FINAL_RESULTS' },
    });
    await expect(setDisplayScreen('VOTING_OPEN')).rejects.toThrow(/follows the voting status/);
  });

  it('refuses a screen change made on a stale page (expected_screen)', async () => {
    applyScenario('closed');
    await adminSignIn(ADMIN.username, ADMIN.password);
    // Another committee member already put Final results on air.
    await setDisplayScreen('FINAL_RESULTS', 'VOTING_CLOSED');
    await expect(setDisplayScreen('MOST_VOTES', 'VOTING_CLOSED')).rejects.toMatchObject({
      code: 'STATE_CONFLICT',
    });
    await expect(setDisplayScreen('MOST_VOTES', 'FINAL_RESULTS')).resolves.toEqual({
      activeScreen: 'MOST_VOTES',
    });
  });

  it('sends expected_status with every voting action', async () => {
    applyScenario('open');
    await adminSignIn(ADMIN.username, ADMIN.password);
    let sent: unknown;
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/admin/election/')) sent = request.clone().json();
    });
    await changeElectionState('close');
    server.events.removeAllListeners('request:start');
    await expect(sent).resolves.toEqual({ expected_status: 'open' });
  });
});

describe('committee: candidates', () => {
  it('adds, edits, uploads a photo and removes a candidate before voting opens', async () => {
    applyScenario('not-started', { candidateSet: 'one' });
    await adminSignIn(ADMIN.username, ADMIN.password);
    expect(await getAdminCandidates()).toHaveLength(1);

    const created = await createCandidate(input());
    expect(created).toMatchObject({ number: 3, missions: ['One', 'Two'], photoUrl: null });
    const updated = await updateCandidate(created.id, input({ name: 'Renamed', number: 2 }));
    expect(updated).toMatchObject({ name: 'Renamed', number: 2 });
    await expect(getAdminCandidate(created.id)).resolves.toMatchObject({ name: 'Renamed' });

    const uploaded = await upload(created.id, PNG, 'image/png');
    expect(uploaded.status).toBe(200);
    const withPhoto = await getAdminCandidate(created.id);
    expect(withPhoto.photoUrl).toMatch(/\.png$/);
    await expect(deleteCandidatePhoto(created.id)).resolves.toMatchObject({ photoUrl: null });

    await deleteCandidate(created.id);
    await expect(getAdminCandidate(created.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('reports taken ballot numbers, invalid fields and bad photos', async () => {
    await adminSignIn(ADMIN.username, ADMIN.password);
    await expect(createCandidate(input({ number: 1 }))).rejects.toMatchObject({
      code: 'BALLOT_NUMBER_TAKEN',
    });
    applyScenario('not-started', { candidateSet: 'none' });
    await adminSignIn(ADMIN.username, ADMIN.password);
    const invalid = await createCandidate(input({ name: '', vision: 'x'.repeat(281) })).catch(
      (e: unknown) => e,
    );
    expect(invalid).toMatchObject({ code: 'VALIDATION' });
    expect(Object.keys((invalid as { fields: object }).fields).sort()).toEqual([
      'full_name',
      'vision',
    ]);
    const created = await createCandidate(input());
    const gif = await upload(created.id, new TextEncoder().encode('GIF89a'), 'image/gif');
    expect([gif.status, await errorCode(gif)]).toEqual([422, 'PHOTO_INVALID']);
    const big = await upload(created.id, new Uint8Array(2 * 1024 * 1024 + 1), 'image/png');
    expect([big.status, await errorCode(big)]).toEqual([413, 'PHOTO_TOO_LARGE']);
  });

  it('locks candidates for good once voting has opened', async () => {
    applyScenario('open');
    await adminSignIn(ADMIN.username, ADMIN.password);
    await expect(updateCandidate('1', input({ number: 1 }))).rejects.toMatchObject({
      code: 'CANDIDATES_LOCKED',
    });
    await expect(deleteCandidate('1')).rejects.toMatchObject({ code: 'CANDIDATES_LOCKED' });
  });
});

describe('public display', () => {
  it('exposes only turnout while voting is open', async () => {
    applyScenario('open');
    const payload = await getDisplay();
    expect(payload.screen).toBe('VOTING_OPEN');
    expect(payload).not.toHaveProperty('results');
  });

  it('shows the candidate lineup before voting opens', async () => {
    const payload = await getDisplay();
    expect(payload).toMatchObject({ screen: 'OPENS_SOON' });
    if (payload.screen === 'OPENS_SOON') expect(payload.candidates).toHaveLength(3);
  });

  it('includes totals only after a result screen is put on air', async () => {
    applyScenario('tie');
    await expect(getDisplay()).resolves.toMatchObject({ screen: 'VOTING_CLOSED' });
    await adminSignIn(ADMIN.username, ADMIN.password);
    await setDisplayScreen('MOST_VOTES');
    const most = await getDisplay();
    expect(most.screen).toBe('MOST_VOTES');
    if (most.screen === 'MOST_VOTES') {
      expect(most.results.isTie).toBe(true);
      expect(most.results.leaders).toHaveLength(2);
      // Only the winners are sent; shares are against all valid votes.
      expect(most.results.candidates).toHaveLength(2);
      expect(most.results.leaders[0]?.share).toBeLessThan(0.5);
    }
    await setDisplayScreen('FINAL_RESULTS');
    const final = await getDisplay();
    if (final.screen === 'FINAL_RESULTS') expect(final.results.candidates).toHaveLength(3);
  });

  it('"The winner is…" carries candidate numbers only', async () => {
    applyScenario('closed');
    await adminSignIn(ADMIN.username, ADMIN.password);
    await setDisplayScreen('WINNER_REVEAL');
    const payload = await getDisplay();
    expect(payload).toMatchObject({ screen: 'WINNER_REVEAL', candidateNumbers: [1, 2, 3] });
    expect(payload).not.toHaveProperty('results');
  });

  it('treats a list the backend leaves out or sends as null as empty', () => {
    // Exactly what the backend sends while there are no candidates yet.
    expect(parseDisplayEvent('{"screen":"voting_opens_soon","status":"not_started"}')).toEqual({
      screen: 'OPENS_SOON',
      candidates: [],
    });
    const turnout = { registered: 10, voted: 0, not_voted: 10, percent: 0 };
    expect(
      parseDisplayEvent(
        JSON.stringify({
          screen: 'most_votes',
          status: 'closed',
          turnout,
          total_votes: 0,
          top_tied: false,
          winners: null,
        }),
      ),
    ).toMatchObject({ screen: 'MOST_VOTES', results: { candidates: [], leaders: [] } });
  });

  it('accepts a candidate list and missions sent as null', async () => {
    server.use(
      http.get(route('getCandidates'), () =>
        HttpResponse.json({
          candidates: [
            {
              id: 1,
              ballot_number: 1,
              full_name: 'A',
              study_program: 'B',
              class_year: 2023,
              vision: 'V',
              missions: null,
              photo_url: null,
            },
          ],
        }),
      ),
    );
    await expect(getCandidates()).resolves.toMatchObject([{ id: '1', missions: [] }]);
    server.use(http.get(route('getCandidates'), () => HttpResponse.json({ candidates: null })));
    await expect(getCandidates()).resolves.toEqual([]);
  });

  it('parses stream events with the same contract as GET /display', () => {
    const event = parseDisplayEvent(
      JSON.stringify({
        screen: 'voting_open',
        status: 'open',
        turnout: { registered: 120, voted: 30, not_voted: 90, percent: 25 },
      }),
    );
    expect(event).toMatchObject({ screen: 'VOTING_OPEN', turnout: { ratio: 0.25 } });
    expect(() => parseDisplayEvent('{"screen":"voting_open"}')).toThrow();
    expect(() => parseDisplayEvent('not json')).toThrow();
  });

  it('the stream sends the payload on the display event through the BFF', async () => {
    applyScenario('open');
    const response = await fetch(new URL('/api/display/stream', window.location.origin));
    expect(response.headers.get('Content-Type')).toMatch(/^text\/event-stream/);
    expect(response.headers.get('X-Accel-Buffering')).toBe('no');
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let text = '';
    while (reader && !text.includes('event: display')) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }
    await reader?.cancel();
    const data = /event: display\ndata: (.+)\n/.exec(text)?.[1] ?? '';
    expect(parseDisplayEvent(data).screen).toBe('VOTING_OPEN');
  });
});
