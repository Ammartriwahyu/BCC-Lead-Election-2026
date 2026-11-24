import { describe, expect, it, vi } from 'vitest';

import { handlePhotoRequest } from './photos';

const ORIGIN = 'http://127.0.0.1:8080';
const FILE = 'a6e7ce024c0d0025d5407e3dbd278e0f.jpg';

const image = (bytes = 3) =>
  new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(bytes) },
  });

describe('handlePhotoRequest', () => {
  it('reads the photo from API_BASE_URL and passes it on as an immutable image', async () => {
    const upstream = vi.fn((_request: Request) => Promise.resolve(image(5)));
    const response = await handlePhotoRequest(FILE, {
      upstream,
      upstreamOrigin: `${ORIGIN}/staging`,
    });
    expect(upstream.mock.calls[0]?.[0].url).toBe(`${ORIGIN}/staging/uploads/candidates/${FILE}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(response.headers.get('Content-Length')).toBe('5');
    expect(response.headers.get('Cache-Control')).toContain('immutable');
    expect((await response.arrayBuffer()).byteLength).toBe(5);
  });

  it('refuses file names that are not a plain photo without asking the backend', async () => {
    const upstream = vi.fn(() => Promise.resolve(image()));
    for (const file of ['..', '../secret.jpg', 'a.svg', 'x']) {
      const response = await handlePhotoRequest(file, { upstream, upstreamOrigin: ORIGIN });
      expect(response.status).toBe(404);
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it('passes on a missing photo as is and never caches it', async () => {
    const upstream = vi.fn(() =>
      Promise.resolve(Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })),
    );
    const response = await handlePhotoRequest(FILE, { upstream, upstreamOrigin: ORIGIN });
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('answers 404 for a non-image answer and 502 when the backend cannot be reached', async () => {
    const html = vi.fn(() =>
      Promise.resolve(new Response('<html>', { headers: { 'Content-Type': 'text/html' } })),
    );
    expect(
      (await handlePhotoRequest(FILE, { upstream: html, upstreamOrigin: ORIGIN })).status,
    ).toBe(404);
    const down = vi.fn(() => Promise.reject(new TypeError('fetch failed')));
    const response = await handlePhotoRequest(FILE, { upstream: down, upstreamOrigin: ORIGIN });
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
