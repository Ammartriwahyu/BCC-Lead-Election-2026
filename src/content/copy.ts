/**
 * Every UI string, in English (BCC website standard). Copy comes from the Figma
 * "Pilketum – v2" frames; entries marked NEW are not in Figma and are listed in docs/DEVIATIONS.md.
 * Strings the committee panel and the root pages also use live in commonCopy.ts.
 */
import { commonCopy } from './commonCopy';

export const content = {
  meta: commonCopy.meta,
  brand: commonCopy.brand,
  field: commonCopy.field,
  voterNav: {
    signedInAs: 'Signed in as',
    signOut: 'Sign out',
  },
  voterFooter: {
    copyright: '© 2026 Basic Computing Community, Universitas Brawijaya',
    copyrightShort: '© 2026 Basic Computing Community',
    organizer: 'Organized by the BCC Election Committee',
  },
  dialog: commonCopy.dialog,
  toast: commonCopy.toast,
  offline: {
    banner: "You're offline. Your vote will not be sent until you're back online.", // NEW
  },
  election: {
    badge: commonCopy.electionBadge,
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
    numberLabel: commonCopy.candidateNumber,
    details: commonCopy.candidateDetails,
    photo: 'Candidate photo',
    photoAlt: commonCopy.candidatePhotoAlt,
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
  loading: commonCopy.loading,
  notFound: commonCopy.notFound,
  error: commonCopy.error,
} as const;
