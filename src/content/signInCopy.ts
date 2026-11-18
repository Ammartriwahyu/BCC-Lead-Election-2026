/**
 * Sign-in copy (V0a–d, V0e two-step code; A0 reuses it). Split from copy.ts so pages after sign-in
 * do not ship it (JS budget). Same rules as copy.ts: entries marked NEW / CHANGED are in DEVIATIONS.
 */
export const signInCopy = {
  title: 'BCC Chairperson Election 2026',
  intro:
    'Sign in with your BCC member account to vote. You get one vote, and nobody can see who you picked.',
  cardTitle: 'Sign in',
  cardSubtitle: 'Use your UB account: your NIM or UB email.', // CHANGED: backend signs in through UB SSO
  username: 'NIM or UB email', // CHANGED: Figma "Email" (backend accepts NIM or UB email)
  usernamePlaceholder: 'NIM or name@student.ub.ac.id', // CHANGED
  password: 'Password',
  passwordPlaceholder: 'Enter your password',
  submit: 'Sign in',
  errors: {
    invalidCredentials: "That NIM or email and password don't match. Check them and try again.", // CHANGED
    notAVoter: "This account isn't on the voter register.", // CHANGED
    usernameRequired: 'Enter your NIM or UB email.', // NEW
    passwordRequired: 'Enter your password.', // NEW
    rateLimited: (seconds: number | undefined) =>
      seconds === undefined
        ? 'Too many attempts. Wait a moment, then try again.'
        : `Too many attempts. Try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`, // NEW
    ssoUnavailable: "UB sign-in isn't responding right now. Try again in a few minutes.", // NEW
    ssoBusy: 'Lots of members are signing in right now. Try again in a few seconds.', // NEW
    network: "We couldn't reach the server. Check your connection and try again.", // NEW
    unknown: 'Something went wrong. Try again, or ask the committee for help.', // NEW
  },
  sessionExpired: 'Your session ended. Sign in again to continue.', // NEW
  /** NEW: second step for UB accounts with two-step verification (no Figma frame). */
  otp: {
    title: 'Enter your verification code',
    body: 'Your UB account uses two-step verification. Enter the 6-digit code from your authenticator app.',
    code: 'Verification code',
    codePlaceholder: '6-digit code',
    device: 'Authenticator',
    submit: 'Verify',
    back: 'Use a different account',
    errors: {
      codeRequired: 'Enter the 6-digit code.',
      codeInvalid: "That code isn't right. Try again.",
      expired: 'Your sign-in timed out. Sign in again.',
    },
  },
} as const;
