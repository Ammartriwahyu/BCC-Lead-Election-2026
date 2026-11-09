import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import { server } from '@/mocks/node';

import { onUnauthorized, request } from './client';
import { ApiError, hasErrorCode } from './errors';

const schema = z.object({ ok: z.boolean() });

describe('request', () => {
  it('parses a valid response', async () => {
    server.use(http.get('*/api/ping', () => HttpResponse.json({ ok: true })));
    await expect(request('/ping', { schema })).resolves.toEqual({ ok: true });
  });

  it('maps backend error codes', async () => {
    server.use(
      http.get('*/api/ping', () =>
        HttpResponse.json({ error: { code: 'VOTING_CLOSED' } }, { status: 409 }),
      ),
    );
    await expect(request('/ping', { schema })).rejects.toMatchObject({
      code: 'VOTING_CLOSED',
      status: 409,
    });
  });

  it('falls back to the status code for unknown or missing codes', async () => {
    server.use(
      http.get('*/api/a', () =>
        HttpResponse.json({ error: { code: 'WHO_KNOWS' } }, { status: 404 }),
      ),
    );
    server.use(http.get('*/api/b', () => new HttpResponse('oops', { status: 500 })));
    await expect(request('/a', { schema })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const error = await request('/b', { schema }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(hasErrorCode(error, 'UNKNOWN')).toBe(true);
    expect((error as ApiError).isTransient).toBe(true);
  });

  it('reports an unexpected response shape as UNKNOWN', async () => {
    server.use(http.get('*/api/ping', () => HttpResponse.json({ nope: 1 })));
    await expect(request('/ping', { schema })).rejects.toMatchObject({ code: 'UNKNOWN' });
  });

  it('maps network failures to NETWORK', async () => {
    server.use(http.get('*/api/ping', () => HttpResponse.error()));
    await expect(request('/ping', { schema })).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('maps timeouts to TIMEOUT', async () => {
    server.use(
      http.get('*/api/ping', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json({ ok: true });
      }),
    );
    await expect(request('/ping', { schema, timeoutMs: 20 })).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
  });

  it('notifies 401 listeners unless skipped', async () => {
    server.use(
      http.get('*/api/ping', () =>
        HttpResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 }),
      ),
    );
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    await request('/ping', { schema }).catch(() => undefined);
    await request('/ping', { schema, skipAuthRedirect: true }).catch(() => undefined);
    unsubscribe();
    await request('/ping', { schema }).catch(() => undefined);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('rethrows caller aborts untouched', async () => {
    server.use(
      http.get('*/api/ping', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json({ ok: true });
      }),
    );
    const controller = new AbortController();
    const pending = request('/ping', { schema, signal: controller.signal });
    controller.abort();
    const error = await pending.catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(ApiError);
  });
});
