import { http, HttpResponse, getResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/mocks/fixtures';
import { handlers, route } from '@/mocks/handlers';
import { applyScenario } from '@/mocks/scenarios';
import { handleMockRequest, MOCK_BACKEND_ORIGIN } from '@/mocks/server';

import { checkContract, firstEvent, type CheckResult } from './contractCheck';

const voter = { username: DEMO_ACCOUNTS.voter, password: DEMO_PASSWORD.voter };
const admin = { username: DEMO_ACCOUNTS.committee, password: DEMO_PASSWORD.committee };

const failures = (results: CheckResult[]) => results.filter((r) => r.status === 'fail');
const find = (results: CheckResult[], check: string) => results.find((r) => r.check === check);

/** The mock backend with some handlers replaced (a backend that breaks the contract). */
function backendWith(...overrides: Parameters<typeof getResponse>[0]) {
  return async (request: Request): Promise<Response> =>
    (await getResponse([...overrides, ...handlers], request)) ??
    new Response(null, { status: 404 });
}

const run = (options: Partial<Parameters<typeof checkContract>[0]> = {}) =>
  checkContract({ baseUrl: MOCK_BACKEND_ORIGIN, fetch: handleMockRequest, ...options });

function streamOf(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

describe('checkContract against the mock backend', () => {
  it('passes every read-only check with voter and committee accounts', async () => {
    const results = await run({ voter, admin });
    expect(failures(results)).toEqual([]);
    expect(find(results, 'getAdminResults (RESULTS_LOCKED)')?.status).toBe('pass');
    expect(find(results, 'streamDisplay')?.status).toBe('pass');
    expect(find(results, 'streamAdmin')?.status).toBe('pass');
    expect(find(results, 'voter token on /admin')?.status).toBe('pass');
    expect(find(results, 'submitVote')?.status).toBe('skip');
  });

  it('reads results and the export once voting is closed', async () => {
    applyScenario('closed');
    const results = await run({ admin });
    expect(find(results, 'getAdminResults')?.status).toBe('pass');
    expect(find(results, 'exportResults')?.status).toBe('pass');
    expect(find(results, 'voter endpoints')?.status).toBe('skip');
  });

  it('skips the signed-in voter checks for a 2FA account', async () => {
    const results = await run({ voter: { ...voter, username: DEMO_ACCOUNTS.otp } });
    expect(find(results, 'voter session')?.status).toBe('skip');
  });

  it('reports a response that breaks the contract', async () => {
    const results = await run({
      fetch: backendWith(
        http.get(route('getElection'), () => HttpResponse.json({ status: 'paused' })),
      ),
    });
    expect(find(results, 'getElection')).toMatchObject({ status: 'fail' });
    expect(find(results, 'getElection')?.detail).toMatch(/status/);
  });

  it('reports a wrong status, a missing error body and a wrong error status', async () => {
    const results = await run({
      fetch: backendWith(
        http.get(route('getDisplay'), () => HttpResponse.json({}, { status: 500 })),
        http.get(route('getMe'), () => new HttpResponse('nope', { status: 401 })),
        http.get(route('getAdminOverview'), () =>
          HttpResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 403 }),
        ),
      ),
    });
    expect(find(results, 'getDisplay')?.detail).toBe('status 500, expected 200');
    expect(find(results, 'getMe without a token')?.detail).toMatch(/error body/);
    expect(find(results, 'getAdminOverview without a token')?.detail).toMatch(/doc says 401/);
  });

  it('fails a stream that is not event-stream, and a sign-in without a token', async () => {
    const results = await run({
      voter,
      fetch: backendWith(
        http.get(route('streamDisplay'), () => new HttpResponse(null, { status: 404 })),
        http.post(route('voterSignIn'), () =>
          HttpResponse.json({
            voter: { nim: '1', name: 'A', email: null, has_voted: false },
            election: { status: 'open' },
          }),
        ),
      ),
    });
    expect(find(results, 'streamDisplay')?.status).toBe('fail');
    expect(find(results, 'voterSignIn token')?.status).toBe('fail');
  });

  it('reports a network failure without throwing', async () => {
    const results = await run({
      fetch: () => Promise.reject(new TypeError('connect ECONNREFUSED')),
    });
    expect(find(results, 'getElection')?.detail).toMatch(/ECONNREFUSED/);
    expect(find(results, 'streamDisplay')?.status).toBe('fail');
  });
});

describe('firstEvent', () => {
  it('skips other events and joins multi-line data', async () => {
    const text =
      'retry: 3000\r\n\r\n: keep-alive\n\nevent: other\ndata: x\n\nevent: display\ndata: {"a":\ndata: 1}\n\n';
    await expect(firstEvent(streamOf(text), 'display')).resolves.toBe('{"a":\n1}');
  });

  it('rejects when the stream ends first', async () => {
    await expect(firstEvent(streamOf('event: other\ndata: x\n\n'), 'display')).rejects.toThrow(
      /ended/,
    );
  });
});
