import { signInCopy } from '@/content/signInCopy';
import { isApiError } from '@/lib/api/errors';

const { errors } = signInCopy;

/** Banner above the voter sign-in form (V0d) for errors that are not about one field. */
export type SignInBanner =
  | { kind: 'invalid' | 'ssoUnavailable' | 'ssoBusy' | 'network' | 'unknown' | 'expired' }
  | { kind: 'rateLimited'; retryAfterSeconds: number | undefined };

export function signInBannerFor(error: unknown): SignInBanner {
  if (!isApiError(error)) return { kind: 'unknown' };
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return { kind: 'invalid' };
    case 'RATE_LIMITED':
      return { kind: 'rateLimited', retryAfterSeconds: error.retryAfterSeconds };
    case 'SSO_UNAVAILABLE':
      return { kind: 'ssoUnavailable' };
    case 'SSO_BUSY':
      return { kind: 'ssoBusy' };
    default:
      return error.isTransient ? { kind: 'network' } : { kind: 'unknown' };
  }
}

export function signInBannerMessage(banner: SignInBanner): string {
  switch (banner.kind) {
    case 'invalid':
      return errors.invalidCredentials;
    case 'rateLimited':
      return errors.rateLimited(banner.retryAfterSeconds);
    case 'ssoUnavailable':
      return errors.ssoUnavailable;
    case 'ssoBusy':
      return errors.ssoBusy;
    case 'network':
      return errors.network;
    case 'expired':
      return signInCopy.otp.errors.expired;
    case 'unknown':
      return errors.unknown;
  }
}
