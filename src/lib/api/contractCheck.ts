/**
 * Live contract check: calls the backend directly (Bearer tokens, as the BFF does) and validates
 * every answer against the registry in contract.ts. Read-only: it never votes, changes the voting
 * state, the display or a candidate. Signing in (when test accounts are given) only creates and
 * ends a session.
 *
 * Run by `pnpm contract:check <backendOrigin>` or `pnpm contract:check --mock`
 * (scripts/check-backend.ts). Not imported by the app.
 */
import * as z from 'zod/mini';

import { ENDPOINTS, ERROR_STATUS, pathFor, type EndpointName } from './contract';
import { errorBodySchema } from './schemas';

export type CheckStatus = 'pass' | 'fail' | 'skip';

export interface CheckResult {
  check: string;
  status: CheckStatus;
  detail: string;
}

export interface Credentials {
  username: string;
  password: string;
}

export interface CheckOptions {
  /** Backend origin without trailing slash; paths keep their `/api` prefix (backend doc). */
  baseUrl: string;
  voter?: Credentials;
  admin?: Credentials;
  /** How long to wait for the first SSE message. */
  streamTimeoutMs?: number;
  fetch?: (request: Request) => Promise<Response>;
}

const DEFAULT_STREAM_TIMEOUT_MS = 5_000;
const UNKNOWN_CANDIDATE_ID = '999999';

/** Endpoints this check never calls. */
const NOT_CALLED: readonly [EndpointName, string][] = [
  ['voterOtp', 'needs a code from an authenticator app'],
  ['submitVote', 'changes data'],
  ['changeElectionState', 'changes data'],
  ['setDisplayScreen', 'changes data'],
  ['createCandidate', 'changes data'],
  ['updateCandidate', 'changes data'],
  ['deleteCandidate', 'changes data'],
  ['uploadCandidatePhoto', 'changes data'],
  ['deleteCandidatePhoto', 'changes data'],
];

interface Call {
  status: number;
  body: unknown;
  headers: Headers;
}

interface SendInit {
  params?: Record<string, string>;
  body?: unknown;
  token?: string | undefined;
  query?: string;
}

function describeIssues(error: z.core.$ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

const tokenOf = (body: unknown): string | undefined =>
  body && typeof body === 'object' && 'token' in body && typeof body.token === 'string'
    ? body.token
    : undefined;

class Checker {
  readonly results: CheckResult[] = [];
  private readonly fetchImpl: (request: Request) => Promise<Response>;

  constructor(private readonly options: CheckOptions) {
    this.fetchImpl = options.fetch ?? ((request) => globalThis.fetch(request));
  }

  record(check: string, status: CheckStatus, detail: string): void {
    this.results.push({ check, status, detail });
  }

  url(name: EndpointName, init: SendInit = {}): string {
    const spec = ENDPOINTS[name];
    const path = 'bffOnly' in spec ? spec.bffOnly.upstreamPath : spec.path;
    return `${this.options.baseUrl}/api${pathFor(path, init.params)}${init.query ?? ''}`;
  }

  async send(name: EndpointName, init: SendInit = {}): Promise<Call> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    if (init.token) headers.Authorization = `Bearer ${init.token}`;
    const response = await this.fetchImpl(
      new Request(this.url(name, init), {
        method: ENDPOINTS[name].method,
        headers,
        redirect: 'manual',
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      }),
    );
    const isJson = response.headers.get('content-type')?.includes('json') ?? false;
    let body: unknown = null;
    if (isJson) body = await response.json().catch(() => null);
    else await response.arrayBuffer().catch(() => null);
    return { status: response.status, body, headers: response.headers };
  }

  /** Calls an endpoint and checks status + body against the registry. */
  async expectOk(
    name: EndpointName,
    init: SendInit = {},
    label: string = name,
  ): Promise<Call | null> {
    const spec = ENDPOINTS[name];
    let call: Call;
    try {
      call = await this.send(name, init);
    } catch (cause) {
      this.record(label, 'fail', `request failed: ${String(cause)}`);
      return null;
    }
    if (call.status !== spec.status) {
      this.record(label, 'fail', `status ${call.status}, expected ${spec.status}`);
      return null;
    }
    if (spec.response) {
      const parsed = z.safeParse(spec.response, call.body);
      if (!parsed.success) {
        this.record(label, 'fail', `body does not match: ${describeIssues(parsed.error)}`);
        return null;
      }
    }
    if ('file' in spec) {
      const disposition = call.headers.get('content-disposition') ?? '';
      if (!/filename/i.test(disposition)) {
        this.record(label, 'fail', 'no file name in Content-Disposition');
        return null;
      }
    }
    this.record(label, 'pass', `${spec.method} ${spec.path} → ${call.status}`);
    return call;
  }

  /** Calls an endpoint and checks it answers the given backend error code with the error body. */
  async expectError(
    name: EndpointName,
    code: string,
    init: SendInit = {},
    label = `${name} (${code})`,
  ): Promise<void> {
    let call: Call;
    try {
      call = await this.send(name, init);
    } catch (cause) {
      this.record(label, 'fail', `request failed: ${String(cause)}`);
      return;
    }
    const parsed = z.safeParse(errorBodySchema, call.body);
    if (!parsed.success) {
      this.record(
        label,
        'fail',
        `status ${call.status}, error body missing or not { error: { code } }`,
      );
      return;
    }
    if (parsed.data.error.code !== code) {
      this.record(label, 'fail', `code ${parsed.data.error.code}, expected ${code}`);
      return;
    }
    const expected = ERROR_STATUS[code];
    this.record(
      label,
      call.status === expected ? 'pass' : 'fail',
      call.status === expected
        ? `→ ${call.status} ${code}`
        : `→ ${call.status} ${code}, doc says ${String(expected)}`,
    );
  }

  /** Reads an SSE stream until the first message of the registry's event, then closes it. */
  async checkStream(name: 'streamDisplay' | 'streamAdmin', token?: string): Promise<void> {
    const spec = ENDPOINTS[name];
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, this.options.streamTimeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS);
    try {
      const response = await this.fetchImpl(
        new Request(this.url(name), {
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        }),
      );
      const type = response.headers.get('content-type') ?? '';
      if (!response.ok || !type.includes('text/event-stream') || !response.body) {
        this.record(name, 'fail', `status ${response.status}, content-type "${type}"`);
        return;
      }
      const data = await firstEvent(response.body, spec.stream.event);
      const parsed = z.safeParse(spec.stream.data, JSON.parse(data));
      this.record(
        name,
        parsed.success ? 'pass' : 'fail',
        parsed.success
          ? `event "${spec.stream.event}" matches`
          : `event body does not match: ${describeIssues(parsed.error)}`,
      );
    } catch (cause) {
      this.record(
        name,
        'fail',
        controller.signal.aborted
          ? 'no event before the timeout'
          : `stream failed: ${String(cause)}`,
      );
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
}

/** Returns the `data` of the first SSE message named `eventName`. */
export async function firstEvent(
  body: ReadableStream<Uint8Array>,
  eventName: string,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) throw new Error('stream ended before the first event');
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n?/g, '\n');
      let end = buffer.indexOf('\n\n');
      while (end >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const lines = block.split('\n');
        const event = lines
          .find((line) => line.startsWith('event:'))
          ?.slice(6)
          .trim();
        const data = lines
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).replace(/^ /, ''))
          .join('\n');
        if (event === eventName && data) return data;
        end = buffer.indexOf('\n\n');
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

async function checkVoter(checker: Checker, voter: Credentials): Promise<void> {
  const signIn = await checker.expectOk('voterSignIn', { body: voter });
  if (!signIn) return;
  if (signIn.body && typeof signIn.body === 'object' && 'otp_required' in signIn.body) {
    checker.record('voter session', 'skip', 'this account uses 2FA: use one without it');
    return;
  }
  const token = tokenOf(signIn.body);
  if (!token) {
    checker.record('voterSignIn token', 'fail', 'no token in the sign-in response');
    return;
  }
  checker.record('voterSignIn token', 'pass', 'token returned');

  await checker.expectOk('getMe', { token });
  await checker.expectOk('getCandidates', { token });
  await checker.expectError('getAdminOverview', 'FORBIDDEN', { token }, 'voter token on /admin');
  await checker.expectOk('voterSignOut', { token });
  await checker.expectError('getMe', 'UNAUTHORIZED', { token }, 'getMe after sign-out');
}

async function checkAdmin(checker: Checker, admin: Credentials): Promise<void> {
  const signIn = await checker.expectOk('adminSignIn', { body: admin });
  if (!signIn) return;
  const token = tokenOf(signIn.body);
  if (!token) {
    checker.record('adminSignIn token', 'fail', 'no token in the sign-in response');
    return;
  }
  checker.record('adminSignIn token', 'pass', 'token returned');

  await checker.expectOk('getAdminMe', { token });
  const overview = await checker.expectOk('getAdminOverview', { token });
  await checker.checkStream('streamAdmin', token);
  await checker.expectOk('getAdminVoters', { token, query: '?page=1&per_page=6' });
  await checker.expectOk('previewDisplay', { token });

  const candidates = await checker.expectOk('getAdminCandidates', { token });
  const list = z.safeParse(ENDPOINTS.getAdminCandidates.response, candidates?.body);
  const first = list.success ? list.data.candidates[0] : undefined;
  if (first)
    await checker.expectOk('getAdminCandidate', { token, params: { id: String(first.id) } });
  else checker.record('getAdminCandidate', 'skip', 'no candidate to look up');
  await checker.expectError('getAdminCandidate', 'NOT_FOUND', {
    token,
    params: { id: UNKNOWN_CANDIDATE_ID },
  });

  const state = z.safeParse(ENDPOINTS.getAdminOverview.response, overview?.body);
  if (!state.success) {
    checker.record('getAdminResults', 'skip', 'status unknown (overview failed)');
  } else if (state.data.status === 'closed') {
    await checker.expectOk('getAdminResults', { token });
    await checker.expectOk('exportResults', { token });
  } else {
    await checker.expectError('getAdminResults', 'RESULTS_LOCKED', { token });
    await checker.expectError('exportResults', 'RESULTS_LOCKED', { token });
  }

  await checker.expectOk('adminSignOut', { token });
}

/** Runs every read-only check. Never throws; failures are results. */
export async function checkContract(options: CheckOptions): Promise<CheckResult[]> {
  const checker = new Checker(options);

  await checker.expectOk('getHealth');
  await checker.expectOk('getElection');
  await checker.expectOk('getDisplay');
  await checker.checkStream('streamDisplay');
  await checker.expectError('getMe', 'UNAUTHORIZED', {}, 'getMe without a token');
  await checker.expectError(
    'getAdminOverview',
    'UNAUTHORIZED',
    {},
    'getAdminOverview without a token',
  );

  if (options.voter) await checkVoter(checker, options.voter);
  else checker.record('voter endpoints', 'skip', 'no voter test account given');

  if (options.admin) await checkAdmin(checker, options.admin);
  else checker.record('committee endpoints', 'skip', 'no committee test account given');

  for (const [name, reason] of NOT_CALLED) checker.record(name, 'skip', reason);
  return checker.results;
}
