/**
 * Next 16 Proxy (formerly middleware):
 * 1. Route guard: only checks that a session cookie exists. Role/state checks happen
 *    in the layouts, because the backend is the source of truth.
 * 2. Per-request CSP nonce.
 * 3. no-store on signed-in pages so Back after sign-out never shows a previous voter's data.
 */
import { NextResponse, type NextRequest } from 'next/server';

import { sessionCookieNames } from '@/config/env';

const VOTER_PREFIXES = ['/candidates', '/vote', '/already-voted', '/closed'];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isVoterRoute(pathname: string): boolean {
  return VOTER_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isAdminRoute(pathname: string): boolean {
  return matchesPrefix(pathname, '/admin') && !matchesPrefix(pathname, '/admin/sign-in');
}

function buildCsp(nonce: string, isDev: boolean): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? ` 'unsafe-eval'` : ''}`,
    // Radix/Vaul set inline style attributes; nonces do not cover attributes.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ');
}

function redirectToSignIn(request: NextRequest, signInPath: string): NextResponse {
  const url = request.nextUrl.clone();
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = signInPath;
  url.search = '';
  url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const voterRoute = isVoterRoute(pathname);
  const adminRoute = isAdminRoute(pathname);
  const cookies = sessionCookieNames();

  if (voterRoute && !request.cookies.has(cookies.voter)) {
    return redirectToSignIn(request, '/sign-in');
  }
  if (adminRoute && !request.cookies.has(cookies.admin)) {
    return redirectToSignIn(request, '/admin/sign-in');
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  if (voterRoute || adminRoute || pathname === '/sign-in' || pathname === '/admin/sign-in') {
    response.headers.set('Cache-Control', 'no-store, max-age=0');
  }
  return response;
}

export const config = {
  // Prefetches go through the guard too, so a protected route is never prefetched without a session.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico|woff2?)$).*)',
  ],
};
