/**
 * Public display copy (D1–D6). Split from content/copy.ts so other areas do not ship these strings (JS budget).
 * Same rules as copy.ts: Figma copy, entries marked NEW are logged in docs/DEVIATIONS.md.
 */
export const displayCopy = {
  pageTitle: 'Display', // NEW: browser tab title
  reconnecting: 'Reconnecting…', // NEW: shown after 30 s without a connection
  opensSoon: {
    eyebrow: 'Get ready to vote',
    title: 'Voting opens soon',
    body: 'The committee will open voting shortly. Have your BCC member account ready.',
    lineup: 'Meet the candidates',
  },
  votingOpen: {
    badge: 'Voting is open',
    lead: 'Vote now with your BCC member account',
    turnout: 'turnout',
    summary: (voted: string, registered: string) => `${voted} of ${registered} members have voted`,
    note: "Results stay hidden until voting closes. Haven't voted yet? Sign in with your BCC member account.",
  },
  votingClosed: {
    eyebrow: 'Thank you for voting',
    title: 'Voting is closed',
    body: 'The committee is preparing the results.',
    membersVoted: 'members voted',
    registered: 'registered',
    turnout: 'turnout',
  },
  winnerReveal: {
    title: 'The most votes go to…',
    hidden: '?',
    counted: (count: number, formatted: string) =>
      `${formatted} ${count === 1 ? 'vote' : 'votes'} counted. Result coming up.`,
  },
  finalResults: {
    title: 'Final results',
    badge: 'Voting closed',
    votes: (count: number) => (count === 1 ? 'vote' : 'votes'),
    registeredMembers: 'registered members',
    turnout: 'turnout',
    leading: 'Most votes', // NEW: screen-reader text on the leading column
    tied: 'Tied for most votes', // NEW: screen-reader text when leaders tie
  },
  mostVotes: {
    label: 'Most votes',
    tiedLabel: 'Tied for most votes', // NEW: D4 tie variant
    noVotes: 'No votes were cast', // NEW: D4 with zero votes
    details: (number: string, major: string, classYear: number) =>
      `Candidate ${number} · ${major}, class of ${classYear}`,
    votes: (count: number) => (count === 1 ? 'vote' : 'votes'),
    ofVotes: (count: number, formatted: string) =>
      `of ${formatted} ${count === 1 ? 'vote' : 'votes'}`,
    thanks: 'Thank you to every member who voted.',
    tieNote: 'The committee will announce how the tie is settled.', // NEW: D4 tie variant
  },
} as const;
