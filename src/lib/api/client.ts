/**
 * The only place in the app that performs HTTP. Same-origin `/api/*`:
 * the mock route handler answers in mock builds, Next rewrites to the backend otherwise.
 */
import * as z from 'zod/mini';

import { HTTP } from '@/config/constants';

import { errorFromResponse } from './errorResponse';
import { ApiError } from './errors';

export const API_PREFIX = '/api';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Any Zod 4 schema (mini or classic): both build on the core type. */
type Schema = z.core.$ZodType;

export interface RequestOptions<S extends Schema> {
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

export interface EventStreamHandlers {
  onOpen: () => void;
  /** Raw `data` of one named event. */
  onEvent: (data: string) => void;
  /** Connection lost or refused. The caller decides whether to close and fall back. */
  onError: () => void;
}

export interface EventStreamHandle {
  close: () => void;
}

/**
 * Server-sent events from same-origin `/api/*`. Returns null where EventSource is not available
 * (tests, old browsers), so callers can fall back to polling.
 */
export function openEventStream(
  path: string,
  eventName: string,
  handlers: EventStreamHandlers,
): EventStreamHandle | null {
  if (typeof EventSource === 'undefined') return null;
  const source = new EventSource(buildUrl(path));
  source.addEventListener('open', handlers.onOpen);
  source.addEventListener(eventName, (event) => {
    if (event instanceof MessageEvent && typeof event.data === 'string')
      handlers.onEvent(event.data);
  });
  source.addEventListener('error', handlers.onError);
  return {
    close: () => {
      source.close();
    },
  };
}

interface SendOptions {
  method: Method;
  body: unknown;
  headers: Record<string, string>;
  signal: AbortSignal | undefined;
  timeoutSignal: AbortSignal;
  combinedSignal: AbortSignal;
  skipAuthRedirect: boolean | undefined;
  accept?: string;
}

/** fetch + error mapping shared by JSON and file requests. FormData bodies go out as multipart. */
async function send(path: string, options: SendOptions): Promise<Response> {
  const { method, body, headers, signal, timeoutSignal, combinedSignal, skipAuthRedirect } =
    options;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: options.accept ?? 'application/json',
        ...(body === undefined || isForm ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: isForm ? body : JSON.stringify(body) }),
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
  return response;
}

/** Downloads a file (e.g. the results export). File name from Content-Disposition. */
export async function requestFile(
  path: string,
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<{ blob: Blob; fileName: string | null }> {
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? HTTP.timeoutMs);
  const combinedSignal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;
  const response = await send(path, {
    method: 'GET',
    body: undefined,
    headers: {},
    signal: options.signal,
    timeoutSignal,
    combinedSignal,
    skipAuthRedirect: false,
    accept: '*/*',
  });
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return {
    blob: await response.blob(),
    fileName: match?.[1] ? decodeURIComponent(match[1]) : null,
  };
}

export async function request<S extends Schema>(
  path: string,
  options: RequestOptions<S>,
): Promise<z.output<S>> {
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

  const response = await send(path, {
    method,
    body,
    headers,
    signal,
    timeoutSignal,
    combinedSignal,
    skipAuthRedirect,
  });

  const json: unknown = response.status === 204 ? {} : await response.json().catch(() => null);
  const parsed = z.safeParse(schema, json);
  if (!parsed.success) {
    throw new ApiError('UNKNOWN', {
      status: response.status,
      message: 'Unexpected response shape',
      cause: parsed.error,
    });
  }
  return parsed.data;
}
