/**
 * msw/node server for Vitest. Like the running app: the browser-side client calls /api/*, the BFF
 * (lib/bff) adds the Bearer token from the session cookie and forwards to the mock backend
 * handlers in-process. Tests can still override a backend answer with `server.use(...)`.
 */
import { http } from 'msw';
import { setupServer } from 'msw/node';

import { sessionCookieNames } from '@/config/env';
import { handleBffRequest } from '@/lib/bff/bff';

import { handleMockRequest, MOCK_BACKEND_ORIGIN } from './server';

export const bffHandler = http.all('*/api/*', ({ request }) =>
  handleBffRequest(request, {
    upstream: handleMockRequest,
    upstreamOrigin: MOCK_BACKEND_ORIGIN,
    cookieNames: sessionCookieNames(),
    allowMockRoutes: true,
  }),
);

export const server = setupServer(bffHandler);
