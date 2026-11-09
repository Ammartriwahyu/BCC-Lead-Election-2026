/**
 * Mock API dispatcher. Only active in builds made with NEXT_PUBLIC_API_MOCKING=enabled.
 * The env check must stay a literal `process.env.NEXT_PUBLIC_*` comparison so the bundler
 * removes the mock import (and the demo accounts) from production builds.
 * With a real backend, next.config.ts rewrites /api/* before this route is reached.
 */
export const dynamic = 'force-dynamic';

async function handle(request: Request): Promise<Response> {
  if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
    const { handleMockRequest } = await import('@/mocks/server');
    return handleMockRequest(request);
  }
  return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
