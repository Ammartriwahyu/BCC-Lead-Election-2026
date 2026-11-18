/**
 * Every browser call to /api/* lands here and goes through the BFF (src/lib/bff): the Next server
 * adds the Bearer token from the httpOnly session cookie and forwards to the backend.
 *
 * Upstream:
 * - mock builds (NEXT_PUBLIC_API_MOCKING=enabled): the in-process mock backend (src/mocks). The env
 *   check must stay a literal `process.env.NEXT_PUBLIC_*` comparison so the bundler removes the
 *   mock import (and the demo accounts) from production builds.
 * - real builds: `API_BASE_URL` (runtime env). Without it every call answers 503 with a message.
 */
import { getServerEnv, sessionCookieNames } from '@/config/env';
import { handleBffRequest, type BffOptions } from '@/lib/bff/bff';

export const dynamic = 'force-dynamic';

const NO_BACKEND_MESSAGE =
  'No backend: API_BASE_URL is not set on this server (docs/INTEGRATION.md).';

let warned = false;

async function upstreamOptions(): Promise<Omit<BffOptions, 'cookieNames'> | null> {
  if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
    const { handleMockRequest, MOCK_BACKEND_ORIGIN } = await import('@/mocks/server');
    return {
      upstream: handleMockRequest,
      upstreamOrigin: MOCK_BACKEND_ORIGIN,
      allowMockRoutes: true,
    };
  }
  const base = getServerEnv().API_BASE_URL;
  if (!base) return null;
  return {
    upstream: (request) => fetch(request, { cache: 'no-store' }),
    upstreamOrigin: base.replace(/\/$/, ''),
    allowMockRoutes: false,
  };
}

async function handle(request: Request): Promise<Response> {
  const options = await upstreamOptions();
  if (!options) {
    if (!warned) {
      warned = true;
      console.error(`[api] ${NO_BACKEND_MESSAGE}`);
    }
    return Response.json(
      { error: { code: 'UNKNOWN', message: NO_BACKEND_MESSAGE } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return handleBffRequest(request, { ...options, cookieNames: sessionCookieNames() });
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
