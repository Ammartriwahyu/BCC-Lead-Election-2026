/**
 * Error type shared by every layer. Kept free of schemas so importing `isApiError` (root providers,
 * query client) does not pull Zod into every page; parsing error bodies lives in errorResponse.ts.
 */
import type { ErrorCode, OtpChallenge } from './types';

export interface ApiErrorOptions {
  status?: number | null;
  message?: string;
  /** Field -> backend message (VALIDATION_FAILED). */
  fields?: Record<string, string>;
  /** Seconds from `Retry-After` (RATE_LIMITED). */
  retryAfterSeconds?: number;
  /** OTP_INVALID: the new one-time flow to use for the next try. */
  otp?: OtpChallenge;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number | null;
  readonly fields: Record<string, string>;
  readonly retryAfterSeconds: number | undefined;
  readonly otp: OtpChallenge | undefined;

  constructor(code: ErrorCode, options: ApiErrorOptions = {}) {
    super(options.message ?? code, { cause: options.cause });
    this.name = 'ApiError';
    this.code = code;
    this.status = options.status ?? null;
    this.fields = options.fields ?? {};
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.otp = options.otp;
  }

  /** Network-level failures where the request may or may not have reached the server. */
  get isTransient(): boolean {
    return (
      this.code === 'NETWORK' ||
      this.code === 'TIMEOUT' ||
      (this.status !== null && this.status >= 500)
    );
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function hasErrorCode(error: unknown, ...codes: ErrorCode[]): boolean {
  return isApiError(error) && codes.includes(error.code);
}
