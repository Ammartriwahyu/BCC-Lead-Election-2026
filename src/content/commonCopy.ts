/**
 * UI strings shared by the voter pages, the committee panel and the root pages (layout, 404,
 * error). Kept apart from copy.ts so the committee panel does not load every voter string
 * (first-load JS budget). copy.ts re-exposes these under the same `content.*` names.
 * Entries marked NEW are not in Figma and are listed in docs/DEVIATIONS.md.
 */
export const commonCopy = {
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
  dialog: {
    close: 'Close', // NEW: accessible name, never visible
  },
  toast: {
    region: 'Notifications', // NEW: accessible name of the toast list
  },
  electionBadge: { NOT_STARTED: 'Not started', OPEN: 'Open', CLOSED: 'Closed' },
  candidateNumber: (n: string) => `Candidate ${n}`,
  candidateDetails: (major: string, classYear: number) => `${major}, class of ${classYear}`,
  candidatePhotoAlt: (name: string) => `Photo of ${name}`, // NEW
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
