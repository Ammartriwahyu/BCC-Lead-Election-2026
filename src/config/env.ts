import { z } from 'zod';

/**
 * Public env vars are inlined at build time, so each one must be read with a
 * literal `process.env.NEXT_PUBLIC_*` expression (no dynamic lookup).
 */
const publicSchema = z.object({
  NEXT_PUBLIC_API_MOCKING: z.enum(['enabled', 'disabled']).default('disabled'),
  NEXT_PUBLIC_BOOTH_MODE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

const serverSchema = z.object({
  API_BASE_URL: z.url().optional(),
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
  const parsed = serverSchema.safeParse({ API_BASE_URL: process.env.API_BASE_URL });
  if (!parsed.success) {
    throw new Error(`Invalid server env: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

/** True only in a build made with NEXT_PUBLIC_API_MOCKING=enabled; dead-code eliminated otherwise. */
export const IS_MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';
