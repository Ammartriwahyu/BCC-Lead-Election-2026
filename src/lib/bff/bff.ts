/**
 * Backend-for-frontend: the Next server sits between the browser and the Pilketum API.
 *
 * The backend authenticates with `Authorization: Bearer <token>`. The browser never sees the token:
 * sign-in responses are intercepted, the token goes into an httpOnly cookie (one per role) and is
 * removed from the body; every other /api/* request is forwarded with the token of its role.
 * Same-origin for the browser, so no CORS and the CSP keeps `connect-src 'self'`.
 *
 * Only endpoints in the registry (lib/api/contract.ts) are forwarded. Server-only module.
 *
 * Rate limits on the backend are per client IP. Every request leaves from this server, so the
 * browser's IP goes along as `X-Client-IP`, with `X-BFF-Secret` to prove it comes from here (the
 * backend ignores `X-Client-IP` without the right secret).
 */
import { matchEndpoint, type EndpointSpec, type SessionRole } from '@/lib/api/contract';

export interface ClientIpOptions {
  /** Shared with the backend (env BFF_SECRET). Never sent to the browser. */
  secret: string;
  /**
   * Proxies in front of this server that append to `X-Forwarded-For` (env TRUSTED_PROXY_HOPS).
   * Entries further left come from the client and could be forged, so they are not used.
   */
  trustedHops: number;
}

export interface BffOptions {
  /** Sends a request to the backend (fetch, or the in-process mock). */
  upstream: (request: Request) => Promise<Response>;
  /** Backend origin, e.g. `https://api.example.org`; paths keep their `/api` prefix. */
  upstreamOrigin: string;
  cookieNames: Record<SessionRole, string>;
  /** Mock builds: also forward `/api/__mock/*` (scenario switcher, mock photos). */
  allowMockRoutes: boolean;
  /** Real backend: pass the browser's IP on (see the module comment). */
  clientIp?: ClientIpOptions;
}

const API_PREFIX = '/api';
const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type', 'last-event-id', 'accept-language'];
const FORWARDED_RESPONSE_HEADERS = [
  'content-type',
  'content-disposition',
  'retry-after',
  'cache-control',
];

function json(status: number, body: unknown, headers: Headers = new Headers()): Response {
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
}

const errorResponse = (status: number, code: string, headers?: Headers) =>
  json(status, { error: { code } }, headers);

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      const value = part.slice(eq + 1).trim();
      return value ? decodeURIComponent(value) : undefined;
    }
  }
  return undefined;
}

function isHttps(request: Request): boolean {
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  return (forwarded ?? new URL(request.url).protocol.replace(':', '')) === 'https';
}

export function sessionCookie(
  request: Request,
  name: string,
  token: string,
  maxAgeSeconds?: number,
): string {
  const parts = [`${name}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (isHttps(request)) parts.push('Secure');
  if (maxAgeSeconds !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  return parts.join('; ');
}

const clearCookie = (request: Request, name: string) => sessionCookie(request, name, '', 0);

/** Rejects state-changing requests sent from another site (defence in depth on top of SameSite). */
function isCrossSite(request: Request): boolean {
  if (request.method === 'GET' || request.method === 'HEAD') return false;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host !== (host ?? new URL(request.url).host);
  } catch {
    return true;
  }
}

function tokenRole(spec: EndpointSpec): SessionRole | null {
  if (spec.endsSession) return spec.endsSession;
  return spec.auth === 'public' ? null : spec.auth;
}

const IP_PATTERN = /^[0-9a-f.:]{2,45}$/i;

/**
 * The browser's IP as seen by the closest trusted proxy: each proxy appends the address it got the
 * request from to `X-Forwarded-For`, so the entry `trustedHops` from the right is the client.
 * Falls back to `X-Real-IP`. Undefined when there is nothing usable.
 */
export function clientIpOf(request: Request, trustedHops: number): string | undefined {
  const chain = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const candidate =
    chain.length > 0
      ? chain[Math.max(0, chain.length - Math.max(1, trustedHops))]
      : request.headers.get('x-real-ip')?.trim();
  return candidate && IP_PATTERN.test(candidate) ? candidate : undefined;
}

function upstreamHeaders(
  request: Request,
  token: string | undefined,
  clientIp: ClientIpOptions | undefined,
): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (clientIp) {
    headers.set('X-BFF-Secret', clientIp.secret);
    const ip = clientIpOf(request, clientIp.trustedHops);
    if (ip) headers.set('X-Client-IP', ip);
  }
  return headers;
}

function passThrough(upstream: Response, extra: Headers = new Headers()): Response {
  const headers = new Headers(extra);
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value && !headers.has(name)) headers.set(name, value);
  }
  if (upstream.headers.get('content-type')?.includes('text/event-stream')) {
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('X-Accel-Buffering', 'no');
  } else if (!headers.has('cache-control')) {
    headers.set('Cache-Control', 'no-store');
  }
  const noBody = upstream.status === 204 || upstream.status === 304;
  return new Response(noBody ? null : upstream.body, { status: upstream.status, headers });
}

/** Sign-in success: keep the token in a cookie, hand the rest of the body to the browser. */
async function storeSession(
  request: Request,
  upstream: Response,
  role: SessionRole,
  options: BffOptions,
): Promise<Response> {
  const body: unknown = await upstream.json().catch(() => null);
  if (!body || typeof body !== 'object' || !('token' in body) || typeof body.token !== 'string') {
    // OTP challenge (or an unexpected body): nothing to store.
    return json(upstream.status, body);
  }
  const {
    token,
    expires_at: expiresAt,
    ...rest
  } = body as Record<string, unknown> & {
    token: string;
  };
  const expiry = typeof expiresAt === 'string' ? Date.parse(expiresAt) : Number.NaN;
  const maxAge = Number.isFinite(expiry) ? (expiry - Date.now()) / 1000 : undefined;
  const headers = new Headers();
  headers.append('Set-Cookie', sessionCookie(request, options.cookieNames[role], token, maxAge));
  return json(upstream.status, rest, headers);
}

/** Handles one browser request to `/api/*`. */
export async function handleBffRequest(request: Request, options: BffOptions): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(`${API_PREFIX}/`)) return errorResponse(404, 'NOT_FOUND');
  const path = url.pathname.slice(API_PREFIX.length);

  if (isCrossSite(request)) return errorResponse(403, 'FORBIDDEN');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const forward = async (upstreamPath: string, token?: string) =>
    options.upstream(
      new Request(`${options.upstreamOrigin}${API_PREFIX}${upstreamPath}${url.search}`, {
        method: request.method,
        headers: upstreamHeaders(request, token, options.clientIp),
        ...(hasBody ? { body: await request.arrayBuffer() } : {}),
        signal: request.signal,
      }),
    );

  if (path.startsWith('/__mock/')) {
    return options.allowMockRoutes
      ? passThrough(await forward(path))
      : errorResponse(404, 'NOT_FOUND');
  }

  const match = matchEndpoint(request.method, path);
  if (!match) return errorResponse(404, 'NOT_FOUND');
  const { spec } = match;

  const role = tokenRole(spec);
  const cookieName = role ? options.cookieNames[role] : undefined;
  const token = cookieName ? readCookie(request, cookieName) : undefined;
  const upstreamPath = spec.bffOnly?.upstreamPath ?? path;

  if (spec.endsSession && cookieName) {
    const headers = new Headers({ 'Set-Cookie': clearCookie(request, cookieName) });
    if (token) {
      // Best effort: the session ends here whatever the backend answers.
      await forward(upstreamPath, token).catch(() => undefined);
    }
    return new Response(null, { status: 204, headers });
  }

  if (role && !token) return errorResponse(401, 'UNAUTHORIZED');

  let upstream: Response;
  try {
    upstream = await forward(upstreamPath, token);
  } catch {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return errorResponse(502, 'UPSTREAM_UNREACHABLE');
  }

  if (spec.startsSession && upstream.ok) {
    return storeSession(request, upstream, spec.startsSession, options);
  }
  if (upstream.status === 401 && cookieName) {
    // Expired or revoked token: drop the cookie so the proxy sends the next page to sign-in.
    return passThrough(upstream, new Headers({ 'Set-Cookie': clearCookie(request, cookieName) }));
  }
  return passThrough(upstream);
}
