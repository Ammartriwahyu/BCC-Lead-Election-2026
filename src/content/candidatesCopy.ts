/**
 * Committee candidates copy (A6–A8 150:3971 …, spec 4.4). Split from adminCopy so the other panel
 * pages do not ship it (JS budget). Same rules as copy.ts: entries marked NEW are logged in
 * docs/DEVIATIONS.md.
 */
export const candidatesCopy = {
  title: 'Candidates',
  subtitle: {
    NOT_STARTED:
      'Members see candidates in ballot order. You can add, edit, or remove candidates until voting opens.',
    OPEN: 'This is the ballot members vote on.',
    CLOSED: 'This is the ballot members vote on.',
  },
  add: 'Add candidate',
  edit: 'Edit',
  editFor: (name: string) => `Edit ${name}`, // NEW: accessible name
  locked: {
    OPEN: 'Candidates are locked while voting is open, so every member votes on the same ballot.',
    CLOSED: 'Candidates are locked after voting closes. Reopening voting keeps them locked.',
    /** NEW: not started again after opening cannot happen on the backend; kept for completeness. */
    NOT_STARTED: 'Candidates are locked because voting has already opened once.',
  },
  note: 'Voting can open once every candidate is complete. You can still edit them until then.',
  complete: 'Complete',
  incomplete: 'Needs a photo', // NEW: Figma only shows "Complete"
  missionCount: (n: number) => `${n} mission ${n === 1 ? 'point' : 'points'}`,
  details: (major: string, classYear: number) => `${major} · Class of ${classYear}`,
  visionPreview: (vision: string) => `Vision: ${vision}`,
  ballot: (n: string) => `Ballot number ${n}`, // NEW: screen-reader label of the number box
  full: 'All ballot numbers are taken. Remove a candidate to add another.', // NEW
  empty: {
    title: 'No candidates yet',
    body: 'Add each candidate with a photo, study program, vision, and mission.',
  },
} as const;
