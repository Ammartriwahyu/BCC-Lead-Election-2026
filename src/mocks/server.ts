/**
 * Runs the mock backend handlers in-process (no service worker, no network), so every tab,
 * booth device and the display share one in-memory database. Called by the BFF as its upstream.
 */
import { getResponse } from 'msw';

import { handlers } from './handlers';

/** Origin the BFF uses for the mock backend; never resolved on the network. */
export const MOCK_BACKEND_ORIGIN = 'http://mock.backend';

export async function handleMockRequest(request: Request): Promise<Response> {
  const response = await getResponse(handlers, request);
  if (response) return response;
  return Response.json({ error: { code: 'NOT_FOUND', message: 'NOT_FOUND' } }, { status: 404 });
}
