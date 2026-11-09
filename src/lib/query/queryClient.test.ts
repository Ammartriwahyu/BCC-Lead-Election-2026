import { ApiError } from '@/lib/api/errors';

import { queryKeys } from './keys';
import { makeQueryClient, shouldRetry } from './queryClient';

describe('shouldRetry', () => {
  it('retries transient failures up to the limit', () => {
    expect(shouldRetry(0, new ApiError('NETWORK'))).toBe(true);
    expect(shouldRetry(1, new ApiError('TIMEOUT'))).toBe(true);
    expect(shouldRetry(2, new ApiError('NETWORK'))).toBe(false);
    expect(shouldRetry(0, new ApiError('UNKNOWN', { status: 503 }))).toBe(true);
  });

  it('never retries final answers', () => {
    expect(shouldRetry(0, new ApiError('UNAUTHORIZED', { status: 401 }))).toBe(false);
    expect(shouldRetry(0, new ApiError('VOTING_CLOSED', { status: 409 }))).toBe(false);
  });

  it('retries unknown non-API errors a limited number of times', () => {
    expect(shouldRetry(0, new Error('boom'))).toBe(true);
    expect(shouldRetry(5, new Error('boom'))).toBe(false);
  });
});

describe('makeQueryClient', () => {
  it('never retries mutations automatically', () => {
    expect(makeQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });
});

describe('queryKeys', () => {
  it('scopes voter and admin data under separate roots', () => {
    expect(queryKeys.voter.candidate('c1').slice(0, 1)).toEqual(queryKeys.voter.all);
    expect(queryKeys.admin.voters('a', 2).slice(0, 1)).toEqual(queryKeys.admin.all);
  });
});
