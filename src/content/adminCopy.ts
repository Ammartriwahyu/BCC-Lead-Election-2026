/**
 * Committee panel copy (A0–A5, dialogs, display control). Split from content/copy.ts so other areas do not ship these strings (JS budget).
 * Same rules as copy.ts: Figma copy, entries marked NEW are logged in docs/DEVIATIONS.md.
 */
export const adminNavCopy = {
  label: 'Committee menu', // NEW: aria-label of the sidebar nav
  overview: 'Overview',
  candidates: 'Candidates',
  voters: 'Voter list',
  results: 'Results',
  resultsLocked: 'locked until voting closes', // NEW: screen-reader text for the lock icon
  signOut: 'Sign out',
  openMenu: 'Open menu', // NEW: drawer toggle below 1024 px
  closeMenu: 'Close menu', // NEW
  breadcrumbRoot: 'Election',
  breadcrumbLabel: 'Breadcrumb', // NEW
  breadcrumbAdd: 'Add', // A7
  breadcrumbEdit: 'Edit', // A8
} as const;

export const adminCopy = {
  signIn: {
    title: 'Sign in as committee',
    username: 'Username', // CHANGED: Figma "Email" (backend signs the committee in by username)
    usernamePlaceholder: 'Committee username', // CHANGED
    usernameRequired: 'Enter your username.', // NEW
    invalidCredentials: "That username and password don't match. Check them and try again.", // CHANGED
    pageTitle: 'Committee sign in', // NEW: browser tab title
  },
  loadError: "We couldn't load this page. Try again.", // NEW
  retry: 'Try again', // NEW
  overview: {
    title: 'Overview',
    subtitle: {
      NOT_STARTED:
        'Members can sign in and read the candidates. Nobody can vote until you open voting.',
      OPEN: 'Members can vote until you close voting.',
      CLOSED: "Members can't vote anymore. Closed by mistake? You can reopen voting.",
    },
    actions: {
      open: 'Open voting now',
      close: 'Close voting',
      reopen: 'Reopen voting',
      viewResults: 'View results',
    },
    stats: {
      registered: 'Registered voters',
      registeredNote: 'On the voter register',
      candidates: 'Candidates',
      candidatesNote: 'Vision and mission published',
      votes: 'Votes received',
      votesNote: 'Voting has not started',
      notVotedYet: 'Not voted yet',
      didNotVote: 'Did not vote',
      turnout: 'Turnout',
      finalTurnout: 'Final turnout',
    },
    turnout: {
      title: 'Turnout',
      summary: (voted: string, registered: string) => `${voted} of ${registered} members`,
      note: 'Candidate totals stay hidden until voting closes. Nobody on the committee can see who a member voted for.',
    },
    status: {
      title: 'Voting status',
      now: 'Now',
      steps: {
        NOT_STARTED: 'Members can sign in and read the candidates',
        OPEN: 'Members can vote',
        CLOSED: 'Votes are final and results unlock',
      },
    },
  },
  dialogs: {
    cancel: 'Cancel',
    open: {
      title: 'Open voting now?',
      body: 'Members can start voting right away. Voting stays open until you close it.',
      confirm: 'Open voting',
      /** NEW (spec 4.4): why voting cannot open yet. The backend needs exactly 3 complete candidates. */
      blockedCount: (count: number, required: number) =>
        `Voting needs ${required} candidates before it can open. There ${count === 1 ? 'is' : 'are'} ${count} now.`,
      blockedPhotos: (labels: string) => `Add a photo for ${labels} before opening voting.`,
      blockedLink: 'Go to candidates',
    },
    close: {
      title: 'Close voting now?',
      body: `Members who haven't voted won't be able to vote, and the videotron switches to "Voting closed". You can't undo this.`,
      confirm: 'Close voting',
      summaryTitle: (voted: string, registered: string) =>
        `${voted} of ${registered} members have voted`,
      summaryText: (count: number, formatted: string) =>
        count === 1 ? '1 member has not voted' : `${formatted} members have not voted`,
    },
    reopen: {
      title: 'Reopen voting?',
      body: `Members who haven't voted can vote again. Results lock again and the videotron switches back to "Voting open".`,
      confirm: 'Reopen voting',
      summaryTitle: (count: number, formatted: string) =>
        count === 1
          ? 'The 1 vote already submitted is kept'
          : `The ${formatted} votes already submitted are kept`,
      summaryText: (count: number, formatted: string) =>
        count === 1 ? "1 member hasn't voted yet" : `${formatted} members haven't voted yet`,
    },
    resultsLocked: {
      title: 'Results are locked',
      body: 'Candidate totals unlock after voting closes. This keeps the count private while members are still voting.',
      confirm: 'OK',
    },
  },
  /** NEW: toasts and announcements for committee actions (spec §4.4). */
  feedback: {
    conflictTitle: 'Someone else changed the voting state',
    conflictBody: 'This page now shows the latest state. Check it before you try again.',
    displayConflictTitle: 'The display changed in the meantime',
    displayConflictBody: 'This page now shows what is on screen. Try again if you still need to.',
    failedTitle: "That didn't go through",
    failedBody: 'Check your connection and try again.',
    announce: {
      open: 'Voting is now open.',
      close: 'Voting is now closed.',
      reopen: 'Voting is open again.',
    },
    displayChanged: (screen: string) => `The display now shows ${screen}.`,
  },
  display: {
    title: 'Display control',
    intro:
      'Choose what the videotron shows. The videotron opens /display, a public page with no sign-in that only shows the screen you pick here.',
    onScreen: 'On screen',
    preview: 'Preview',
    previewFor: (screen: string) => `Preview ${screen} in a new tab`, // NEW: accessible name
    show: 'Show on display',
    showFor: (screen: string) => `Show on display: ${screen}`, // NEW: accessible name
    screens: {
      OPENS_SOON: {
        name: 'Voting opens soon',
        text: 'Candidate lineup while members wait for voting to open',
        thumbnail: 'Soon',
      },
      VOTING_OPEN: {
        name: 'Voting open',
        text: 'Live turnout. Candidate totals stay hidden.',
        thumbnail: 'Open', // NEW: only used if the turnout is not loaded
      },
      VOTING_CLOSED: {
        name: 'Voting closed',
        text: 'Shown automatically when you close voting',
        thumbnail: 'Closed',
      },
      WINNER_REVEAL: {
        name: 'The winner is…',
        text: 'Suspense screen before the result',
        thumbnail: '? ? ?',
      },
      FINAL_RESULTS: {
        name: 'Final results',
        text: 'Votes and share for every candidate',
        thumbnail: 'Results', // NEW: shown while totals are locked or do not fit
      },
      MOST_VOTES: {
        name: 'Most votes',
        text: 'Spotlight on the candidate with the most votes',
        thumbnail: 'Most votes',
      },
    },
    reasons: {
      onlyBeforeOpen: 'Only before voting opens',
      whenOpens: 'Available when voting opens',
      onlyWhileOpen: 'Only while voting is open',
      whenCloses: 'Shown when voting closes',
      afterCloses: 'Available after voting closes',
    },
    thumbnailSeparator: ' · ',
  },
  voters: {
    title: 'Voter list',
    noEmail: '—', // NEW: the register has no email until the member signs in once
    noEmailLabel: 'No email yet', // NEW: screen-reader text for the dash
    subtitle: {
      NOT_STARTED: (_voted: string, registered: string) =>
        `${registered} members can vote when voting opens.`,
      OPEN: (voted: string, registered: string) => `${voted} of ${registered} members have voted.`,
      CLOSED: (voted: string, registered: string) =>
        `Final list. ${voted} of ${registered} members voted.`,
    },
    searchPlaceholder: 'Search by name or email',
    searchLabel: 'Search voters by name or email', // NEW: accessible name
    showing: (from: string, to: string, total: string) => `Showing ${from}–${to} of ${total}`,
    noResultsCount: '0 results',
    tableCaption: 'Voter register', // NEW: screen-reader table caption
    columns: { name: 'Member name', email: 'Email', status: 'Status' },
    status: { VOTED: 'Voted', NOT_VOTED: 'Not voted' },
    previous: 'Previous',
    next: 'Next',
    paginationLabel: 'Voter list pages', // NEW
    page: (page: string, pageCount: string) => `${page} / ${pageCount}`,
    pageSr: (page: string, pageCount: string) => `Page ${page} of ${pageCount}`, // NEW
    emptyTitle: (query: string) => `No member matches "${query}"`,
    emptyBody: 'Check the spelling, or search by email instead.',
    clearSearch: 'Clear search',
  },
  results: {
    title: 'Results',
    subtitle: (count: number, votes: string, registered: string) =>
      `${votes} ${count === 1 ? 'vote' : 'votes'} from ${registered} registered members.`,
    votes: (count: number, formatted: string) => `${formatted} ${count === 1 ? 'vote' : 'votes'}`,
    listLabel: 'Results by candidate', // NEW: accessible name of the list
    leading: 'Most votes', // NEW: screen-reader text on the leading row
    tied: 'Tied for most votes', // NEW: screen-reader text when leaders tie
    note: (votes: string) =>
      `Shares are based on ${votes} valid votes. If the top two are tied, follow the committee's tie rule before announcing.`,
    export: 'Export results (.xlsx)', // NEW: backend export, no Figma frame
    exporting: 'Preparing file…', // NEW
    exportFailed: "We couldn't export the results. Try again.", // NEW
    // NEW: backend integrity_ok = false
    integrity:
      "The number of ballots doesn't match the members who voted. Don't announce the results yet; contact the backend team.",
  },
} as const;
