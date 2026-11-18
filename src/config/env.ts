import * as z from 'zod/mini';

import { MAX_TRUSTED_PROXY_HOPS, SESSION_COOKIES } from './constants';

/**
 * Public env vars are inlined at build time, so each one must be read with a
 * literal `process.env.NEXT_PUBLIC_*` expression (no dynamic lookup).
 */
const publicSchema = z.object({
  NEXT_PUBLIC_API_MOCKING: z._default(z.enum(['enabled', 'disabled']), 'disabled'),
  NEXT_PUBLIC_BOOTH_MODE: z.pipe(
    z._default(z.enum(['true', 'false']), 'true'),
    z.transform((value) => value === 'true'),
  ),
});

/** RFC 6265 cookie-name token. */
const cookieName = z.string().check(z.regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/));

const serverSchema = z.object({
  /** Backend base URL without `/api`; may carry a path (staging: https://host/staging). */
  API_BASE_URL: z.optional(z.url()),
  /** Shared secret for `X-BFF-Secret` (backend answer #1). Different per environment. */
  BFF_SECRET: z.optional(z.string().check(z.minLength(16))),
  /** Proxies in front of the Next server that append to X-Forwarded-For (nginx alone: 1). */
  TRUSTED_PROXY_HOPS: z._default(
    z.coerce.number().check(z.int(), z.gte(1), z.lte(MAX_TRUSTED_PROXY_HOPS)),
    1,
  ),
  /** Names of the backend's httpOnly session cookies (ASSUMED defaults in constants.ts). */
  SESSION_COOKIE_VOTER: z._default(cookieName, SESSION_COOKIES.voter),
  SESSION_COOKIE_ADMIN: z._default(cookieName, SESSION_COOKIES.admin),
});

const parsedPublic = publicSchema.safeParse({
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
  NEXT_PUBLIC_BOOTH_MODE: process.env.NEXT_PUBLIC_BOOTH_MODE,
});

if (!parsedPublic.success) {
  throw new Error(`Invalid public env: ${z.prettifyError(parsedPublic.error)}`);
}

export const publicEnv = {
  apiMocking: parsedPublic.data.NEXT_PUBLIC_API_MOCKING === 'enabled',
  boothMode: parsedPublic.data.NEXT_PUBLIC_BOOTH_MODE,
} as const;

/** Server-only values. Never import this from a client component. */
export function getServerEnv(): z.infer<typeof serverSchema> {
  const parsed = serverSchema.safeParse({
    API_BASE_URL: process.env.API_BASE_URL,
    BFF_SECRET: process.env.BFF_SECRET || undefined,
    TRUSTED_PROXY_HOPS: process.env.TRUSTED_PROXY_HOPS || undefined,
    SESSION_COOKIE_VOTER: process.env.SESSION_COOKIE_VOTER || undefined,
    SESSION_COOKIE_ADMIN: process.env.SESSION_COOKIE_ADMIN || undefined,
  });
  if (!parsed.success) {
    throw new Error(`Invalid server env: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

/** Session cookie names the proxy checks (and the mock sets). Server-only. */
export function sessionCookieNames(): { voter: string; admin: string } {
  const env = getServerEnv();
  return { voter: env.SESSION_COOKIE_VOTER, admin: env.SESSION_COOKIE_ADMIN };
}

/** True only in a build made with NEXT_PUBLIC_API_MOCKING=enabled; dead-code eliminated otherwise. */
export const IS_MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';
