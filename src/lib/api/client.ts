/**
 * The only place in the app that performs HTTP. Same-origin `/api/*`:
 * the mock route handler answers in mock builds, Next rewrites to the backend otherwise.
 */
import type { z } from 'zod';

import { HTTP } from '@/config/constants';

import { ApiError, errorFromResponse } from './errors';

export const API_PREFIX = '/api';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestOptions<S extends z.ZodType> {
  method?: Method;
  body?: unknown;
  schema: S;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Skip the global 401 handler (e.g. sign-in, where 401 means bad credentials). */
  skipAuthRedirect?: boolean;
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Subscribe to session expiry (401). Returns an unsubscribe function. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function buildUrl(path: string): string {
  const relative = `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
  // Absolute in the browser/jsdom so the same code runs under Vitest (Node fetch rejects relative URLs).
  return typeof window === 'undefined'
    ? relative
    : new URL(relative, window.location.origin).toString();
}

export async function request<S extends z.ZodType>(
  path: string,
  options: RequestOptions<S>,
): Promise<z.infer<S>> {
  const {
    method = 'GET',
    body,
    schema,
    headers = {},
    timeoutMs = HTTP.timeoutMs,
    signal,
    skipAuthRedirect,
  } = options;

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: combinedSignal,
    });
  } catch (cause) {
    if (timeoutSignal.aborted) throw new ApiError('TIMEOUT', { cause });
    if (signal?.aborted) throw cause;
    throw new ApiError('NETWORK', { cause });
  }

  if (!response.ok) {
    const error = await errorFromResponse(response);
    if (error.code === 'UNAUTHORIZED' && !skipAuthRedirect) {
      unauthorizedListeners.forEach((listener) => {
        listener();
      });
    }
    throw error;
  }

  const json: unknown = response.status === 204 ? {} : await response.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError('UNKNOWN', {
      status: response.status,
      message: 'Unexpected response shape',
      cause: parsed.error,
    });
  }
  return parsed.data;
}
