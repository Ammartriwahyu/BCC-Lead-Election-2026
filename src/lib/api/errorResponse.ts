/** Maps HTTP error responses to ApiError. Used by client.ts only. */
import * as z from 'zod/mini';

import { ApiError } from './errors';
import { errorBodySchema, otpDeviceDtoSchema } from './schemas';
import type { ErrorCode, OtpChallenge } from './types';

/** Backend code -> the code the UI acts on. Unknown codes fall back to the HTTP status. */
const CODE_MAP: Record<string, ErrorCode> = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  NOT_REGISTERED: 'NOT_A_VOTER',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  SSO_UNAVAILABLE: 'SSO_UNAVAILABLE',
  SSO_BUSY: 'SSO_BUSY',
  ALREADY_VOTED: 'ALREADY_VOTED',
  VOTING_NOT_OPEN: 'VOTING_NOT_OPEN',
  INVALID_STATE: 'STATE_CONFLICT',
  // Another committee member put a different screen on air (expected_screen did not match).
  DISPLAY_CHANGED: 'STATE_CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RESULTS_LOCKED: 'RESULTS_LOCKED',
  CANDIDATES_LOCKED: 'CANDIDATES_LOCKED',
  MEMBERS_LOCKED: 'CANDIDATES_LOCKED',
  CANDIDATES_INCOMPLETE: 'CANDIDATES_INCOMPLETE',
  BALLOT_NUMBER_TAKEN: 'BALLOT_NUMBER_TAKEN',
  PHOTO_TOO_LARGE: 'PHOTO_TOO_LARGE',
  PHOTO_INVALID: 'PHOTO_INVALID',
  VALIDATION_FAILED: 'VALIDATION',
  BAD_REQUEST: 'VALIDATION',
  INVALID_SCREEN: 'VALIDATION',
};

export function codeFromStatus(status: number): ErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'STATE_CONFLICT';
  if (status === 413) return 'PHOTO_TOO_LARGE';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 422 || status === 400) return 'VALIDATION';
  return 'UNKNOWN';
}

function retryAfter(response: Response): number | undefined {
  const value = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function otpFrom(
  flow: string | undefined,
  devices: unknown[] | undefined,
): OtpChallenge | undefined {
  if (!flow) return undefined;
  const parsed = z.safeParse(z.array(otpDeviceDtoSchema), devices ?? []);
  return {
    flow,
    devices: parsed.success
      ? parsed.data.map((d) => ({ id: d.id, name: d.name, isDefault: d.default }))
      : [],
  };
}

/** Maps a non-2xx response to an ApiError, preferring the backend's error code. */
export async function errorFromResponse(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error body (proxy page, empty body): fall back to the status code.
  }
  const retryAfterSeconds = retryAfter(response);
  const base = {
    status: response.status,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  };
  const parsed = errorBodySchema.safeParse(body);
  if (!parsed.success) return new ApiError(codeFromStatus(response.status), base);

  const { error, flow, devices } = parsed.data;
  const otp = otpFrom(flow, devices);
  return new ApiError(CODE_MAP[error.code] ?? codeFromStatus(response.status), {
    ...base,
    ...(error.message ? { message: error.message } : {}),
    ...(error.fields ? { fields: error.fields } : {}),
    ...(otp ? { otp } : {}),
  });
}
