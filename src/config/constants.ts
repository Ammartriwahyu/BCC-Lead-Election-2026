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
  /** Admin Results page while voting is open: live totals per candidate (DEVIATIONS #86). */
  adminLiveResultsMs: 3 * SECOND,
  /** Public display fallback when no stream is available. */
  displayMs: 3 * SECOND,
} as const;

export const HTTP = {
  /** Default request timeout. */
  timeoutMs: 10 * SECOND,
  /** Vote submission timeout (V4 shows after this). */
  submitTimeoutMs: 15 * SECOND,
  /** Sign-in goes through UB SSO, which can be slow at peak times. */
  signInTimeoutMs: 30 * SECOND,
  /** Candidate photo upload (up to 2 MB). */
  uploadTimeoutMs: 60 * SECOND,
  /** Results export (.xlsx built on the backend). */
  exportTimeoutMs: 60 * SECOND,
} as const;

export const QUERY = {
  defaultStaleMs: 30 * SECOND,
  candidatesStaleMs: 5 * TIME.minute,
  gcMs: 5 * TIME.minute,
  /**
   * Finished mutations are dropped at once. Their callbacks close over form state (inputs, the
   * whole page), and the default 5 min kept every previous voter's sign-in page alive on a booth.
   */
  mutationGcMs: 0,
  maxRetries: 2,
} as const;

export const BOOTH = {
  idleTimeoutMs: 90 * SECOND,
  idleCountdownSeconds: 30,
  /** After the vote (V5) and on "already voted" (V5b): the booth is free again quickly. */
  autoSignOutSeconds: 3,
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
  /** After a stream that worked drops, poll and try the stream again after this long. */
  streamRetryMs: 60 * SECOND,
  /** Final results podium: the leading bar is this tall; the others scale with their share. */
  podiumMaxBarPx: 400,
  /** Shortest podium bar, so the share label always fits (24 padding + 48 line + 24). */
  podiumMinBarPx: 96,
  /** More candidates than this switch the podium to a ranked bar list. */
  podiumMaxColumns: 3,
} as const;

export const UI = {
  toastDurationMs: 6 * SECOND,
  /** Gap so screen readers announce a repeated live-region message. */
  announceResetMs: 50,
} as const;

export const ADMIN = {
  votersPageSize: 6,
  searchDebounceMs: 300,
  /** The Final results thumbnail lists the votes only when they fit (the design shows three). */
  thumbnailMaxCandidates: 3,
  /** Used when the export response has no Content-Disposition file name. */
  exportFallbackName: 'pilketum-results.xlsx',
  /** Candidate toasts (spec 4.4: 3 seconds). */
  candidateToastMs: 3 * SECOND,
} as const;

export const STREAM = {
  /**
   * After a stream that worked drops (/admin/stream, /election/stream): poll, and try the stream
   * again after this.
   */
  retryMs: 60 * SECOND,
} as const;

/** Candidate rules (backend doc + spec 4.4). The stricter limit of the two wins. */
export const CANDIDATE = {
  /** Ballot numbers the backend accepts. */
  ballotNumbers: [1, 2, 3],
  /** Voting opens only with exactly this many complete candidates (backend CANDIDATES_INCOMPLETE). */
  requiredCount: 3,
  /** Spec 4.4: 80 (backend allows 100). */
  nameMax: 80,
  studyProgramMax: 100,
  visionMax: 280,
  missionsMin: 1,
  missionsMax: 5,
  /**
   * The backend limit (spec 4.4 said 160). The committee set no rule of its own (20 Nov 2026,
   * DEVIATIONS #87), so the form allows what the backend accepts.
   */
  missionMax: 200,
  photoMaxBytes: 2 * 1024 * 1024,
  photoTypes: ['image/jpeg', 'image/png'],
  /** Portrait 3:4 (width / height), the shape of the candidates' photos. */
  photoAspect: 3 / 4,
  /** Adjust photo dialog (NEW, DEVIATIONS #88): frame width on screen, zoom range and steps. */
  photoFrameWidth: 240,
  photoMaxZoom: 4,
  photoZoomStep: 0.05,
  /** One mouse wheel notch on the frame zooms this much. */
  photoWheelZoomStep: 0.1,
  /**
   * Live previews in the Adjust dialog, at `scale` of the real size: the ballot card photo on large
   * screens (CandidateCard md:h-300, card width at 1512) and phones (h-104 w-88), and the profile
   * (CandidateProfileHero md:h-280 md:w-240). Photos fill these top-aligned (CandidateImage).
   */
  photoPreviews: {
    cardLarge: { width: 380, height: 300, scale: 0.6 },
    cardPhone: { width: 88, height: 104, scale: 1 },
    profile: { width: 240, height: 280, scale: 0.5 },
  },
  /** Arrow keys move the photo this far (Shift: the larger step), in frame pixels. */
  photoNudgePx: 8,
  photoNudgeLargePx: 40,
  /** An adjusted photo is saved as a JPEG this wide at most (never upscaled), 3:4. */
  photoOutputWidth: 800,
  photoJpegQuality: 0.9,
  /** Class years offered in the form: the election year and the six before it. */
  classYearLatest: 2026,
  classYearCount: 7,
} as const;

/** OTP codes from authenticator apps. */
export const OTP = {
  codeLength: 6,
} as const;

export const FORMAT = {
  locale: 'en-US',
  timeZone: 'Asia/Jakarta',
  percentDigits: 1,
} as const;

/**
 * httpOnly cookies set by the Next server (lib/bff) to hold the backend's Bearer tokens.
 * Defaults for SESSION_COOKIE_VOTER / _ADMIN (config/env.ts).
 */
export const SESSION_COOKIES = {
  voter: 'pilketum_voter_session',
  admin: 'pilketum_admin_session',
} as const;

/** Upper bound for TRUSTED_PROXY_HOPS (env): more proxies than this is a misconfiguration. */
export const MAX_TRUSTED_PROXY_HOPS = 5;

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
  adminCandidates: '/admin/candidates',
  adminCandidateNew: '/admin/candidates/new',
  adminCandidateEdit: (id: string) => `/admin/candidates/${encodeURIComponent(id)}/edit`,
  display: '/display',
} as const;
