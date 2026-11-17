import { afterEach, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIES } from './constants';
import { getServerEnv, sessionCookieNames } from './env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sessionCookieNames', () => {
  it('defaults to the assumed backend cookie names', () => {
    vi.stubEnv('SESSION_COOKIE_VOTER', '');
    vi.stubEnv('SESSION_COOKIE_ADMIN', '');
    expect(sessionCookieNames()).toEqual(SESSION_COOKIES);
  });

  it('follows the server env', () => {
    vi.stubEnv('SESSION_COOKIE_VOTER', 'bcc_sid');
    vi.stubEnv('SESSION_COOKIE_ADMIN', '__Host-bcc_admin');
    expect(sessionCookieNames()).toEqual({ voter: 'bcc_sid', admin: '__Host-bcc_admin' });
  });

  it('rejects a name that is not a cookie token', () => {
    vi.stubEnv('SESSION_COOKIE_VOTER', 'bad name;');
    expect(() => getServerEnv()).toThrow(/SESSION_COOKIE_VOTER/);
  });
});
