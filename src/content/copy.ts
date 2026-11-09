/**
 * Every UI string, in English (BCC website standard). Copy comes from the Figma
 * "Pilketum – v2" frames; entries marked NEW are not in Figma and are listed in docs/DEVIATIONS.md.
 */
export const content = {
  meta: {
    title: 'BCC Chairperson Election 2026',
    description:
      'Vote for the next chairperson of Basic Computing Community, Universitas Brawijaya.',
  },
  brand: {
    logoAlt: 'BCC — Basic Computing Community',
    electionName: 'Chairperson Election 2026',
  },
  field: {
    requiredMark: '*',
    showPassword: 'Show password', // NEW: accessible name of the eye toggle
    hidePassword: 'Hide password', // NEW
  },
  voterNav: {
    signedInAs: 'Signed in as',
    signOut: 'Sign out',
  },
  voterFooter: {
    copyright: '© 2026 Basic Computing Community, Universitas Brawijaya',
    copyrightShort: '© 2026 Basic Computing Community',
    organizer: 'Organized by the BCC Election Committee',
  },
  adminNav: {
    label: 'Committee menu', // NEW: aria-label of the sidebar nav
    overview: 'Overview',
    voters: 'Voter list',
    results: 'Results',
    resultsLocked: 'locked until voting closes', // NEW: screen-reader text for the lock icon
    signOut: 'Sign out',
    openMenu: 'Open menu', // NEW: drawer toggle below 1024 px
    closeMenu: 'Close menu', // NEW
    breadcrumbRoot: 'Election',
    breadcrumbLabel: 'Breadcrumb', // NEW
  },
  dialog: {
    close: 'Close', // NEW: accessible name, never visible
  },
  offline: {
    banner: "You're offline. Your vote will not be sent until you're back online.", // NEW
  },
  election: {
    badge: { NOT_STARTED: 'Not started', OPEN: 'Open', CLOSED: 'Closed' },
    /** Sign-in status strip (V0a–c). */
    strip: {
      NOT_STARTED: 'The committee will open voting during the event.',
      OPEN: 'Voting is open now.',
      CLOSED: 'The committee has closed voting.',
    },
    /** NEW: polite aria-live announcements when the state changes under the voter. */
    announce: {
      opened: 'Voting is open. You can now pick a candidate.',
      closed: 'Voting has closed.',
      reopened: 'Voting is open again. You can now pick a candidate.',
    },
  },
  signIn: {
    title: 'BCC Chairperson Election 2026',
    intro:
      'Sign in with your BCC member account to vote. You get one vote, and nobody can see who you picked.',
    cardTitle: 'Sign in',
    cardSubtitle: 'Use the email you registered with BCC.',
    email: 'Email',
    emailPlaceholder: 'name@student.ub.ac.id',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    submit: 'Sign in',
    errors: {
      invalidCredentials: "That email and password don't match. Check them and try again.",
      notAVoter: "This email isn't on the voter register.",
      emailRequired: 'Enter your email.', // NEW
      emailInvalid: 'Enter a valid email address.', // NEW
      passwordRequired: 'Enter your password.', // NEW
      network: "We couldn't reach the server. Check your connection and try again.", // NEW
      unknown: 'Something went wrong. Try again, or ask the committee for help.', // NEW
    },
    sessionExpired: 'Your session ended. Sign in again to continue.', // NEW
  },
  candidates: {
    heroOpen: {
      title: 'Pick your next chairperson',
      body: 'Choose one candidate, then review and submit your vote. You can change your pick until you submit.',
      bodyMobile:
        'Choose one candidate, then review and submit. You can change your pick until you submit.',
    },
    heroNotStarted: {
      title: "Voting hasn't opened yet",
      body: "The committee will open voting during the election event. Until then, you can read each candidate's vision and mission.",
    },
    sectionTitle: 'Candidates',
    count: (n: number) => `${n} ${n === 1 ? 'candidate' : 'candidates'} · 1 vote per member`,
    countMobile: '1 vote per member',
    numberLabel: (n: string) => `Candidate ${n}`,
    details: (major: string, classYear: number) => `${major}, class of ${classYear}`,
    photo: 'Candidate photo',
    photoAlt: (name: string) => `Photo of ${name}`, // NEW
    visionMission: 'Vision & mission',
    visionMissionFor: (name: string) => `Vision & mission of ${name}`, // NEW: accessible name
    select: 'Select',
    selectFor: (name: string) => `Select ${name}`, // NEW: accessible name
    selected: 'Selected',
    selectedFor: (name: string) => `Selected ${name}`, // NEW: accessible name (press to clear)
    yourPick: 'Your pick',
    noPick: 'No candidate selected yet',
    noPickMobile: 'None yet',
    pickSummary: (name: string, number: string) => `${name} (Candidate ${number})`,
    reviewAndSubmit: 'Review and submit',
    reviewAndSubmitMobile: 'Review & submit',
    loadError: "We couldn't load the candidates. Try again.", // NEW
    retry: 'Try again', // NEW
    announcePicked: (name: string) => `${name} selected.`, // NEW
    announceCleared: 'Selection cleared.', // NEW
  },
  candidate: {
    back: 'Back to candidates',
    backMobile: 'Back',
    selectThis: 'Select this candidate',
    selectedThis: 'Selected', // NEW: V&M state when this candidate is already the pick
    notOpenNote: 'You can vote once the committee opens voting.',
    vision: 'Vision',
    mission: 'Mission',
  },
  confirm: {
    title: (name: string) => `Vote for ${name}?`,
    body: 'You can only vote once. After you submit, you cannot change your vote.',
    bodyMobile: "You can only vote once. After you submit, you can't change it.",
    summaryDetails: (number: string, major: string, classYear: number) =>
      `Candidate ${number} · ${major}, class of ${classYear}`,
    cancel: 'Cancel',
    submit: 'Submit vote',
    offlineHint: "You're offline. Reconnect to submit.", // NEW
    submittingTitle: 'Submitting your vote',
    submittingBody: 'Keep this page open. This takes a few seconds.',
  },
  voteError: {
    title: "Your vote didn't go through",
    body: 'The connection dropped before we could save it, so nothing was recorded. You can try again.',
    retry: 'Try again',
    back: 'Back to candidates',
  },
  voteSubmitted: {
    title: 'Thanks, your vote is in',
    body: 'Results are announced after the committee closes voting.',
    signOut: 'Sign out',
  },
  alreadyVoted: {
    title: "You've already voted",
    body: 'Each member can vote once, and your vote is already counted.',
    signOut: 'Sign out',
  },
  closed: {
    title: 'Voting has closed',
    body: 'The committee has closed voting and will announce the result.',
    signOut: 'Sign out',
  },
  submittedAt: (date: string, time: string) => `Submitted ${date} at ${time}`,
  booth: {
    // NEW: shared-device mode (spec §4.3)
    autoSignOut: (seconds: number) => `Signing you out in ${seconds}s`,
    idleTitle: 'Still there?',
    idleBody: (seconds: number) =>
      `For your privacy, we'll sign you out in ${seconds} seconds unless you continue.`,
    idleContinue: "I'm still here",
    idleSignOut: 'Sign out now',
  },
  loading: 'Loading…', // NEW: screen-reader text for skeletons
  notFound: {
    // NEW: 404 page in the V6 style
    title: 'Page not found',
    body: "We couldn't find that page. Check the link, or go back to the start.",
    action: 'Go to sign in',
  },
  error: {
    // NEW: error boundary in the V6 style
    title: 'Something went wrong',
    body: 'Try again. If it keeps happening, ask someone from the committee for help.',
    action: 'Try again',
  },
} as const;
