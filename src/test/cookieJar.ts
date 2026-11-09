/**
 * Test-only cookie jar. Node's fetch keeps no cookies, so session cookies set by the
 * mock handlers would be lost between requests. This wraps fetch (after MSW has patched it)
 * and behaves like a browser for same-origin requests, including HttpOnly cookies.
 */
const jar = new Map<string, string>();

function storeSetCookie(header: string): void {
  const [pair = '', ...attributes] = header.split(';');
  const eq = pair.indexOf('=');
  if (eq < 0) return;
  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim();
  const expired = attributes.some((attr) => /^\s*max-age\s*=\s*0\s*$/i.test(attr));
  if (expired || value === '') jar.delete(name);
  else jar.set(name, value);
}

export function installCookieJar(): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    if (jar.size > 0) {
      headers.set('Cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '));
    }
    const response = await original(input, { ...init, headers });
    response.headers.getSetCookie().forEach(storeSetCookie);
    return response;
  };
  return () => {
    globalThis.fetch = original;
  };
}

export function clearCookieJar(): void {
  jar.clear();
}
