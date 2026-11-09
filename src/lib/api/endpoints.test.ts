/**
 * Contract tests: lib/api endpoint functions against the mock handlers (msw/node).
 * These pin the ASSUMED contract so the real backend can be checked against it later.
 */
import { applyScenario } from '@/mocks/scenarios';

import {
  adminSignIn,
  adminSignOut,
  changeElectionState,
  getAdminMe,
  getAdminOverview,
  getAdminResults,
  getAdminVoters,
  getCandidate,
  getCandidates,
  getDisplay,
  getElection,
  getMe,
  setDisplayScreen,
  submitVote,
  voterSignIn,
  voterSignOut,
} from './endpoints';
import { hasErrorCode } from './errors';

const VOTER = { email: 'voter@bcc.test', password: 'pilketum2026' };
const ADMIN = { email: 'committee@bcc.test', password: 'committee2026' };

async function signOutAll() {
  await voterSignOut();
  await adminSignOut();
}

afterEach(signOutAll);

describe('voter sign-in', () => {
  it('signs in a registered voter and returns the election', async () => {
    const session = await voterSignIn(VOTER.email, VOTER.password);
    expect(session.voter).toMatchObject({
      email: VOTER.email,
      status: 'NOT_VOTED',
      submittedAt: null,
    });
    expect(session.election.state).toBe('NOT_STARTED');
    await expect(getMe()).resolves.toMatchObject({ email: VOTER.email });
  });

  it('rejects a wrong password with INVALID_CREDENTIALS', async () => {
    const error = await voterSignIn(VOTER.email, 'nope').catch((e: unknown) => e);
    expect(hasErrorCode(error, 'INVALID_CREDENTIALS')).toBe(true);
  });

  it('rejects non-voters and unknown emails with NOT_A_VOTER on the email field', async () => {
    const guest = await voterSignIn('guest@bcc.test', 'pilketum2026').catch((e: unknown) => e);
    const unknown = await voterSignIn('nobody@bcc.test', 'pilketum2026').catch((e: unknown) => e);
    expect(guest).toMatchObject({ code: 'NOT_A_VOTER', field: 'email' });
    expect(unknown).toMatchObject({ code: 'NOT_A_VOTER', field: 'email' });
  });

  it('reports the voted status for voted@bcc.test', async () => {
    const session = await voterSignIn('voted@bcc.test', 'pilketum2026');
    expect(session.voter.status).toBe('VOTED');
    expect(session.voter.submittedAt).toBeInstanceOf(Date);
  });

  it('requires a session for /me and candidates', async () => {
    await expect(getMe()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(getCandidates()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('candidates', () => {
  it('lists candidates sorted by number and returns 404 for an unknown id', async () => {
    await voterSignIn(VOTER.email, VOTER.password);
    const candidates = await getCandidates();
    expect(candidates.map((c) => c.number)).toEqual([1, 2, 3]);
    const first = candidates[0];
    expect(first?.missions.length).toBeGreaterThan(0);
    if (first) await expect(getCandidate(first.id)).resolves.toMatchObject({ id: first.id });
    await expect(getCandidate('nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('voting', () => {
  it('refuses votes before voting opens', async () => {
    await voterSignIn(VOTER.email, VOTER.password);
    await expect(submitVote('cand-01', 'k1')).rejects.toMatchObject({ code: 'VOTING_NOT_OPEN' });
  });

  it('stores one vote and replays the same receipt for the same Idempotency-Key', async () => {
    applyScenario('open');
    await voterSignIn(VOTER.email, VOTER.password);
    const first = await submitVote('cand-02', 'key-1');
    const replay = await submitVote('cand-02', 'key-1');
    expect(replay.submittedAt.toISOString()).toBe(first.submittedAt.toISOString());
    await expect(submitVote('cand-02', 'key-2')).rejects.toMatchObject({ code: 'ALREADY_VOTED' });
    await expect(getMe()).resolves.toMatchObject({ status: 'VOTED' });
  });

  it('fails once without storing in the submit-fails scenario', async () => {
    applyScenario('submit-fails');
    await voterSignIn(VOTER.email, VOTER.password);
    await expect(submitVote('cand-01', 'key-a')).rejects.toMatchObject({
      code: 'UNKNOWN',
      status: 503,
    });
    await expect(getMe()).resolves.toMatchObject({ status: 'NOT_VOTED' });
    await expect(submitVote('cand-01', 'key-a')).resolves.toHaveProperty('submittedAt');
  });

  it('stores the vote but loses the response in submit-lost-response', async () => {
    applyScenario('submit-lost-response');
    await voterSignIn(VOTER.email, VOTER.password);
    await expect(submitVote('cand-01', 'key-b')).rejects.toMatchObject({ status: 503 });
    await expect(getMe()).resolves.toMatchObject({ status: 'VOTED' });
    await expect(submitVote('cand-01', 'key-b')).resolves.toHaveProperty('submittedAt');
  });

  it('closes voting mid-vote in closed-mid-vote', async () => {
    applyScenario('closed-mid-vote');
    await voterSignIn(VOTER.email, VOTER.password);
    await expect(submitVote('cand-01', 'key-c')).rejects.toMatchObject({ code: 'VOTING_CLOSED' });
    await expect(getElection()).resolves.toMatchObject({ state: 'CLOSED' });
  });

  it('rejects an unknown candidate', async () => {
    applyScenario('open');
    await voterSignIn(VOTER.email, VOTER.password);
    await expect(submitVote('cand-99', 'key-d')).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('admin', () => {
  it('rejects bad committee credentials', async () => {
    await expect(adminSignIn(ADMIN.email, 'x')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('opens, closes and reopens with expected-state checks', async () => {
    await adminSignIn(ADMIN.email, ADMIN.password);
    await expect(getAdminMe()).resolves.toMatchObject({ email: ADMIN.email });
    await expect(changeElectionState('open', 'NOT_STARTED')).resolves.toMatchObject({
      state: 'OPEN',
    });
    // A second committee member acting on a stale state gets STATE_CONFLICT.
    await expect(changeElectionState('open', 'NOT_STARTED')).rejects.toMatchObject({
      code: 'STATE_CONFLICT',
    });
    await expect(changeElectionState('close', 'OPEN')).resolves.toMatchObject({ state: 'CLOSED' });
    await expect(changeElectionState('reopen', 'CLOSED')).resolves.toMatchObject({ state: 'OPEN' });
  });

  it('keeps results locked until voting closes', async () => {
    applyScenario('open');
    await adminSignIn(ADMIN.email, ADMIN.password);
    await expect(getAdminResults()).rejects.toMatchObject({ code: 'RESULTS_LOCKED', status: 403 });
    await changeElectionState('close', 'OPEN');
    const results = await getAdminResults();
    expect(results.results.candidates).toHaveLength(3);
    expect(results.turnout.votesReceived).toBe(results.results.validVotes);
  });

  it('reports overview turnout without candidate totals', async () => {
    applyScenario('closed');
    await adminSignIn(ADMIN.email, ADMIN.password);
    const overview = await getAdminOverview();
    expect(overview.turnout.registeredVoters).toBe(139);
    expect(overview.turnout.votesReceived).toBe(Math.round(139 * 0.8));
    expect(JSON.stringify(overview)).not.toMatch(/votes"?:\s*\d+,"share/);
  });

  it('searches and paginates voters server-side', async () => {
    await adminSignIn(ADMIN.email, ADMIN.password);
    const first = await getAdminVoters({ q: '', page: 1 });
    expect(first.total).toBe(139);
    expect(first.items).toHaveLength(6);
    expect(first.pageCount).toBe(24);
    const last = await getAdminVoters({ q: '', page: 999 });
    expect(last.page).toBe(24);
    const search = await getAdminVoters({ q: 'member001', page: 1 });
    expect(search.items.map((v) => v.email)).toEqual(['member001@student.ub.ac.id']);
    const none = await getAdminVoters({ q: 'zzz', page: 1 });
    expect(none.total).toBe(0);
    expect(none.items).toEqual([]);
    // Voter rows never carry a candidate.
    expect(Object.keys(first.items[0] ?? {})).toEqual(['id', 'name', 'email', 'status']);
  });

  it('changes the display screen with version checks and state rules', async () => {
    applyScenario('closed');
    await adminSignIn(ADMIN.email, ADMIN.password);
    const { display } = await getAdminOverview();
    expect(display.activeScreen).toBe('VOTING_CLOSED');
    const next = await setDisplayScreen('FINAL_RESULTS', display.version);
    expect(next.activeScreen).toBe('FINAL_RESULTS');
    await expect(setDisplayScreen('MOST_VOTES', display.version)).rejects.toMatchObject({
      code: 'STATE_CONFLICT',
    });
    await expect(setDisplayScreen('VOTING_OPEN', next.version)).rejects.toMatchObject({
      code: 'STATE_CONFLICT',
    });
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

  it('includes totals only after Show on display picks a result screen', async () => {
    applyScenario('tie');
    await expect(getDisplay()).resolves.toMatchObject({ screen: 'VOTING_CLOSED' });
    await adminSignIn(ADMIN.email, ADMIN.password);
    const { display } = await getAdminOverview();
    await setDisplayScreen('MOST_VOTES', display.version);
    const payload = await getDisplay();
    expect(payload.screen).toBe('MOST_VOTES');
    if (payload.screen === 'MOST_VOTES') {
      expect(payload.results.isTie).toBe(true);
      expect(payload.results.leaders).toHaveLength(2);
    }
  });
});
