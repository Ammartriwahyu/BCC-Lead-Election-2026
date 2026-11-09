/** Every tunable number lives here. No magic numbers in components or hooks. */

const SECOND = 1000;

export const TIME = {
  second: SECOND,
  minute: 60 * SECOND,
} as const;

export const POLLING = {
  /** Voter pages watch the election state (NOT_STARTED -> OPEN, OPEN -> CLOSED, reopen). */
  electionStateMs: 5 * SECOND,
  /** Admin overview live turnout. Spec target: <= 5 s delay. */
  adminOverviewMs: 4 * SECOND,
  /** Public display fallback when no stream is available. */
  displayMs: 3 * SECOND,
} as const;

export const HTTP = {
  /** Default request timeout. */
  timeoutMs: 10 * SECOND,
  /** Vote submission timeout (V4 shows after this). */
  submitTimeoutMs: 15 * SECOND,
} as const;

export const QUERY = {
  defaultStaleMs: 30 * SECOND,
  candidatesStaleMs: 5 * TIME.minute,
  gcMs: 5 * TIME.minute,
  maxRetries: 2,
} as const;

export const BOOTH = {
  idleTimeoutMs: 90 * SECOND,
  idleCountdownSeconds: 30,
  autoSignOutSeconds: 10,
} as const;

export const DISPLAY = {
  width: 1920,
  height: 1080,
  fadeMs: 400,
  hideCursorAfterMs: 3 * SECOND,
  /** Show the small "reconnecting" dot only after this long without a successful update. */
  disconnectedIndicatorAfterMs: 30 * SECOND,
  backoffBaseMs: 1 * SECOND,
  backoffMaxMs: 30 * SECOND,
} as const;

export const UI = {
  toastDurationMs: 6 * SECOND,
  /** Gap so screen readers announce a repeated live-region message. */
  announceResetMs: 50,
} as const;

export const ADMIN = {
  votersPageSize: 6,
  searchDebounceMs: 300,
} as const;

export const FORMAT = {
  locale: 'en-US',
  timeZone: 'Asia/Jakarta',
  percentDigits: 1,
} as const;

export const SESSION_COOKIES = {
  voter: 'pilketum_voter_session',
  admin: 'pilketum_admin_session',
} as const;

export const ROUTES = {
  signIn: '/sign-in',
  candidates: '/candidates',
  candidate: (id: string) => `/candidates/${encodeURIComponent(id)}`,
  voteSubmitted: '/vote/submitted',
  voteError: '/vote/error',
  alreadyVoted: '/already-voted',
  closed: '/closed',
  adminSignIn: '/admin/sign-in',
  adminOverview: '/admin',
  adminVoters: '/admin/voters',
  adminResults: '/admin/results',
  display: '/display',
} as const;
