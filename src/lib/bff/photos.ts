import { HTTP, PHOTOS } from '@/config/constants';
import { isPhotoFileName } from '@/lib/api/photoUrl';

export interface PhotoOptions {
  upstream: (request: Request) => Promise<Response>;
  /** `API_BASE_URL` without a trailing slash. */
  upstreamOrigin: string;
  /** The browser's request signal: a closed tab stops the upstream read. */
  signal?: AbortSignal;
}

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * One candidate photo, read from the backend at `API_BASE_URL/uploads/candidates/<file>` and
 * passed on unchanged. next/image resizes it from here (a local path), so the Next server never
 * calls the public photo host. Only image answers are passed on; anything else is a 404.
 */
export async function handlePhotoRequest(file: string, options: PhotoOptions): Promise<Response> {
  if (!isPhotoFileName(file)) return new Response(null, { status: 404, headers: NO_STORE });
  const timeout = AbortSignal.timeout(HTTP.timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let upstream: Response;
  try {
    upstream = await options.upstream(
      new Request(`${options.upstreamOrigin}${PHOTOS.upstreamPath}/${file}`, { signal }),
    );
  } catch {
    return new Response(null, { status: 502, headers: NO_STORE });
  }
  const type = upstream.headers.get('Content-Type') ?? '';
  if (!upstream.ok || !type.startsWith('image/')) {
    // Not awaited: on Node's fetch the cancel settles only when the timeout aborts the request.
    upstream.body?.cancel().catch(() => undefined);
    return new Response(null, { status: upstream.ok ? 404 : upstream.status, headers: NO_STORE });
  }
  const headers = new Headers({
    'Content-Type': type,
    'Cache-Control': PHOTOS.cacheControl,
    'X-Content-Type-Options': 'nosniff',
  });
  const length = upstream.headers.get('Content-Length');
  if (length) headers.set('Content-Length', length);
  return new Response(upstream.body, { status: 200, headers });
}
