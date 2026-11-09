import { errorBodySchema, errorCodeSchema } from './schemas';
import type { ErrorCode } from './types';

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number | null;
  readonly field: string | undefined;

  constructor(
    code: ErrorCode,
    options: { status?: number | null; message?: string; field?: string; cause?: unknown } = {},
  ) {
    super(options.message ?? code, { cause: options.cause });
    this.name = 'ApiError';
    this.code = code;
    this.status = options.status ?? null;
    this.field = options.field;
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

function codeFromStatus(status: number): ErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'STATE_CONFLICT';
  if (status === 422 || status === 400) return 'VALIDATION';
  return 'UNKNOWN';
}

/** Maps a non-2xx response to an ApiError, preferring the backend's error code. */
export async function errorFromResponse(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error body (proxy page, empty body): fall back to the status code.
  }
  const parsed = errorBodySchema.safeParse(body);
  if (parsed.success) {
    const code = errorCodeSchema.safeParse(parsed.data.error.code);
    return new ApiError(code.success ? code.data : codeFromStatus(response.status), {
      status: response.status,
      ...(parsed.data.error.message ? { message: parsed.data.error.message } : {}),
      ...(parsed.data.error.field ? { field: parsed.data.error.field } : {}),
    });
  }
  return new ApiError(codeFromStatus(response.status), { status: response.status });
}
