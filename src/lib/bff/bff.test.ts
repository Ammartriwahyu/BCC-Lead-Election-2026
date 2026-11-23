import { describe, expect, it, vi } from 'vitest';

import { clientIpOf, handleBffRequest, readCookie, sessionCookie, type BffOptions } from './bff';

const ORIGIN = 'https://pilketum.example.org';
const COOKIES = { voter: 'voter_sid', admin: 'admin_sid' };

function options(upstream: BffOptions['upstream'], extra: Partial<BffOptions> = {}): BffOptions {
  return {
    upstream,
    upstreamOrigin: 'https://api.example.org',
    cookieNames: COOKIES,
    allowMockRoutes: false,
    ...extra,
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function req(path: string, init: RequestInit = {}): Request {
  return new Request(`${ORIGIN}/api${path}`, init);
}

describe('handleBffRequest', () => {
  it('stores the sign-in token in an httpOnly cookie and hides it from the browser', async () => {
    const upstream = vi.fn(() =>
      Promise.resolve(
        json({
          token: 'secret-token',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          voter: { nim: '1' },
          election: { status: 'open' },
        }),
      ),
    );
    const response = await handleBffRequest(
      req('/auth/login', { method: 'POST', body: '{}', headers: { Origin: ORIGIN } }),
      options(upstream),
    );
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ voter: { nim: '1' }, election: { status: 'open' } });
    const cookie = response.headers.get('Set-Cookie') ?? '';
    expect(cookie).toMatch(
      /^voter_sid=secret-token; Path=\/; HttpOnly; SameSite=Lax; Secure; Max-Age=(59|60)$/,
    );
    const sent = (upstream.mock.calls as unknown as Request[][])[0]?.[0] as Request;
    expect(sent.url).toBe('https://api.example.org/api/auth/login');
  });

  it('passes an OTP challenge through unchanged (nothing to store)', async () => {
    const challenge = { otp_required: true, flow: 'f', devices: [] };
    const response = await handleBffRequest(
      req('/auth/login', { method: 'POST', body: '{}' }),
      options(() => Promise.resolve(json(challenge))),
    );
    expect(await response.json()).toEqual(challenge);
    expect(response.headers.get('Set-Cookie')).toBeNull();
  });

  it('sends the role token as Bearer, the client IP with the secret, and the query', async () => {
    const upstream = vi.fn(() => Promise.resolve(json({ ok: true })));
    await handleBffRequest(
      req('/admin/voters?page=2', {
        headers: { cookie: 'voter_sid=v; admin_sid=a%20b', 'x-forwarded-for': '10.0.0.7' },
      }),
      options(upstream, { clientIp: { secret: 's3cret', trustedHops: 1 } }),
    );
    const sent = (upstream.mock.calls as unknown as Request[][])[0]?.[0] as Request;
    expect(sent.url).toBe('https://api.example.org/api/admin/voters?page=2');
    expect(sent.headers.get('Authorization')).toBe('Bearer a b');
    expect(sent.headers.get('X-BFF-Secret')).toBe('s3cret');
    expect(sent.headers.get('X-Client-IP')).toBe('10.0.0.7');
    expect(sent.headers.get('X-Forwarded-For')).toBeNull();
    expect(sent.headers.get('cookie')).toBeNull();
  });

  it('keeps the base path of the backend URL (staging lives under /staging)', async () => {
    const upstream = vi.fn(() => Promise.resolve(json({ ok: true })));
    await handleBffRequest(
      req('/election'),
      options(upstream, { upstreamOrigin: 'https://api.example.org/staging' }),
    );
    const sent = (upstream.mock.calls as unknown as Request[][])[0]?.[0] as Request;
    expect(sent.url).toBe('https://api.example.org/staging/api/election');
  });

  it('sends no client IP headers without a secret', async () => {
    const upstream = vi.fn(() => Promise.resolve(json({ ok: true })));
    await handleBffRequest(
      req('/election', { headers: { 'x-forwarded-for': '10.0.0.7' } }),
      options(upstream),
    );
    const sent = (upstream.mock.calls as unknown as Request[][])[0]?.[0] as Request;
    expect(sent.headers.get('X-BFF-Secret')).toBeNull();
    expect(sent.headers.get('X-Client-IP')).toBeNull();
  });

  it('answers 401 without calling the backend when the session cookie is missing', async () => {
    const upstream = vi.fn(() => Promise.resolve(json({})));
    const response = await handleBffRequest(req('/me'), options(upstream));
    expect(response.status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('clears the cookie when the backend says the token expired', async () => {
    const response = await handleBffRequest(
      req('/me', { headers: { cookie: 'voter_sid=old' } }),
      options(() => Promise.resolve(json({ error: { code: 'UNAUTHORIZED' } }, 401))),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get('Set-Cookie')).toMatch(/^voter_sid=; .*Max-Age=0/);
  });

  it('keeps the cookie on a 401 from a stream (EventSource cannot act on it)', async () => {
    const response = await handleBffRequest(
      req('/election/stream', { headers: { cookie: 'voter_sid=old' } }),
      options(() => Promise.resolve(json({ error: { code: 'UNAUTHORIZED' } }, 401))),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get('Set-Cookie')).toBeNull();
  });

  it('signs out locally whatever the backend answers; committee sign-out maps to /auth/logout', async () => {
    const upstream = vi.fn(() => Promise.reject(new Error('down')));
    const response = await handleBffRequest(
      req('/admin/auth/logout', { method: 'POST', headers: { cookie: 'admin_sid=a' } }),
      options(upstream),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('Set-Cookie')).toMatch(/^admin_sid=; .*Max-Age=0/);
    const sent = (upstream.mock.calls as unknown as Request[][])[0]?.[0] as Request;
    expect(sent.url).toBe('https://api.example.org/api/auth/logout');
    expect(sent.headers.get('Authorization')).toBe('Bearer a');
  });

  it('only forwards registry endpoints, and mock routes only when allowed', async () => {
    const upstream = vi.fn(() => Promise.resolve(json({})));
    expect((await handleBffRequest(req('/secret'), options(upstream))).status).toBe(404);
    expect((await handleBffRequest(req('/__mock/state'), options(upstream))).status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
    const allowed = await handleBffRequest(
      req('/__mock/state'),
      options(upstream, { allowMockRoutes: true }),
    );
    expect(allowed.status).toBe(200);
  });

  it('refuses state-changing requests from another site', async () => {
    const upstream = vi.fn(() => Promise.resolve(json({})));
    const response = await handleBffRequest(
      req('/votes', {
        method: 'POST',
        body: '{}',
        headers: { Origin: 'https://evil.example', cookie: 'voter_sid=v' },
      }),
      options(upstream),
    );
    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('streams server-sent events without buffering hints and reports an unreachable backend', async () => {
    const stream = await handleBffRequest(
      req('/display/stream'),
      options(() =>
        Promise.resolve(
          new Response('event: display\ndata: {}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
          }),
        ),
      ),
    );
    expect(stream.headers.get('Cache-Control')).toBe('no-cache, no-transform');
    expect(stream.headers.get('X-Accel-Buffering')).toBe('no');
    await expect(stream.text()).resolves.toContain('event: display');

    const down = await handleBffRequest(
      req('/election'),
      options(() => Promise.reject(new TypeError('fetch failed'))),
    );
    expect(down.status).toBe(502);
  });
});

describe('cookies', () => {
  it('reads a cookie by name and writes Secure only on https', () => {
    const request = new Request('http://localhost/api/me', {
      headers: { cookie: 'a=1; voter_sid=x%3Dy; b=' },
    });
    expect(readCookie(request, 'voter_sid')).toBe('x=y');
    expect(readCookie(request, 'b')).toBeUndefined();
    expect(sessionCookie(request, 'voter_sid', 't')).toBe(
      'voter_sid=t; Path=/; HttpOnly; SameSite=Lax',
    );
    const proxied = new Request('http://localhost/api/me', {
      headers: { 'x-forwarded-proto': 'https' },
    });
    expect(sessionCookie(proxied, 'voter_sid', 't', 10)).toMatch(/Secure; Max-Age=10$/);
  });
});

describe('clientIpOf', () => {
  const withHeaders = (headers: Record<string, string>) => new Request(ORIGIN, { headers });

  it('takes the address the closest trusted proxy saw, not what the client wrote', () => {
    // The client forged 6.6.6.6; nginx appended the real address.
    const request = withHeaders({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' });
    expect(clientIpOf(request, 1)).toBe('203.0.113.9');
    // Behind two proxies (e.g. a CDN, then nginx) the client is one further left.
    const twoHops = withHeaders({ 'x-forwarded-for': '203.0.113.9, 198.51.100.2' });
    expect(clientIpOf(twoHops, 2)).toBe('203.0.113.9');
  });

  it('falls back to X-Real-IP and ignores anything that is not an IP', () => {
    expect(clientIpOf(withHeaders({ 'x-real-ip': '2001:db8::1' }), 1)).toBe('2001:db8::1');
    expect(clientIpOf(withHeaders({ 'x-forwarded-for': 'evil<script>' }), 1)).toBeUndefined();
    expect(clientIpOf(withHeaders({}), 1)).toBeUndefined();
  });
});
