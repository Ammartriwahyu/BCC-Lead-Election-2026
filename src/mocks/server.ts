/**
 * Runs the MSW handlers inside the Next server (no service worker), so every tab,
 * booth device and the display share one in-memory database.
 */
import { getResponse } from 'msw';

import { handlers } from './handlers';

export async function handleMockRequest(request: Request): Promise<Response> {
  const response = await getResponse(handlers, request);
  if (response) return response;
  return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
}
