/**
 * Demo data for the mock API ONLY. Never imported by production code paths:
 * the mock route is compiled out when NEXT_PUBLIC_API_MOCKING !== 'enabled'
 * (verified by scripts/check-bundle.mjs).
 */

export const DEMO_PASSWORD = {
  voter: 'pilketum2026',
  committee: 'committee2026',
} as const;

/** Vote time of members who voted before the scenario starts (10:24 WIB, as in Figma V5). */
export const PRE_VOTED_AT = '2026-11-20T03:24:00.000Z';

/** Committee name for the topbar (backend default). */
export const COMMITTEE_DISPLAY_NAME = 'Election Committee';

/** Voters sign in with NIM or email (UB SSO); the committee with a username. */
export const DEMO_ACCOUNTS = {
  voter: 'voter@bcc.test',
  voterNim: '235150200111001',
  voter2: 'voter2@bcc.test',
  voted: 'voted@bcc.test',
  /** Valid UB account, not on the voter register: NOT_REGISTERED. */
  guest: 'guest@bcc.test',
  /** 2FA account: answers with an OTP challenge. Code: DEMO_OTP_CODE. */
  otp: 'otp@bcc.test',
  /** UB SSO not responding (502 SSO_UNAVAILABLE). */
  ssoDown: 'sso-down@bcc.test',
  /** UB SSO queue full (503 SSO_BUSY). */
  ssoBusy: 'sso-busy@bcc.test',
  committee: 'committee',
  committee2: 'committee2',
} as const;

export const DEMO_OTP_CODE = '246810';

export const DEMO_OTP_DEVICES = [
  { id: 'dev-authenticator', name: 'Google Authenticator', default: true },
  { id: 'dev-backup', name: 'Backup phone', default: false },
] as const;

export interface MemberFixture {
  nim: string;
  name: string;
  email: string | null;
  password: string;
  /** false = valid UB account but not on the voter register (NOT_REGISTERED). */
  isVoter: boolean;
  votedInitially: boolean;
  department: string;
  classYear: number;
  studyProgram: string;
  sso?: 'otp' | 'down' | 'busy';
}

export interface CommitteeFixture {
  username: string;
  password: string;
  displayName: string;
}

export const COMMITTEE: CommitteeFixture[] = [
  {
    username: DEMO_ACCOUNTS.committee,
    password: DEMO_PASSWORD.committee,
    displayName: COMMITTEE_DISPLAY_NAME,
  },
  {
    username: DEMO_ACCOUNTS.committee2,
    password: DEMO_PASSWORD.committee,
    displayName: COMMITTEE_DISPLAY_NAME,
  },
];

export const MAJORS = [
  'Information Systems',
  'Informatics Engineering',
  'Computer Engineering',
  'Information Technology',
  'Information Technology Education',
] as const;

const DEPARTMENTS = ['Front End', 'Back End', 'UI/UX', 'Mobile', 'Data Science'] as const;

const VISIONS = [
  'BCC should be a place where every member, new or senior, gets real practice and someone to learn from.',
  'Members from different divisions should build projects together that real people use.',
  "Every division should have a clear learning path, from a member's first class to mentoring others.",
  'Every division growing side by side, with clear paths from first class to first project.',
  'A BCC that listens first, plans with its members, and keeps its promises every semester.',
  'Learning by building: more workshops, more mentoring, more chances to present.',
] as const;

const MISSIONS = [
  [
    'Run monthly beginner classes in every division.',
    'Pair each new member with a senior mentor for their first semester.',
    'Hold an open showcase each semester where members present their work.',
  ],
  [
    'Start a project incubator with three teams per semester.',
    'Publish a yearly learning roadmap for each division.',
    'Partner with alumni for portfolio reviews.',
  ],
  [
    'Write a step-by-step curriculum for each division.',
    'Give an internal certificate at the end of each stage.',
    'Train senior members to mentor and speak at BCC events.',
  ],
  [
    'Hold quarterly town halls with all members.',
    'Document every event so the next team can repeat it.',
  ],
  [
    'Run a hackathon every semester.',
    'Give every division a budget for its own events.',
    'Hold an annual BCC open house.',
    'Set up a member feedback form after each program.',
  ],
  [
    'Offer certificates for completed learning tracks.',
    'Grow the mentor pool to one mentor per five new members.',
    'Run a summer internship prep program.',
  ],
] as const;

export interface CandidateFixture {
  ballotNumber: number;
  fullName: string;
  studyProgram: string;
  classYear: number;
  vision: string;
  missions: string[];
  /** Index into MOCK_PHOTOS, or null for no photo (incomplete). */
  photo: number | null;
}

function candidate(index: number, overrides: Partial<CandidateFixture> = {}): CandidateFixture {
  const n = index + 1;
  return {
    ballotNumber: n,
    fullName: `Candidate Name ${String(n).padStart(2, '0')}`,
    studyProgram: MAJORS[index % MAJORS.length] ?? MAJORS[0],
    classYear: index === 2 ? 2024 : 2023,
    vision: VISIONS[index % VISIONS.length] ?? VISIONS[0],
    missions: [...(MISSIONS[index % MISSIONS.length] ?? MISSIONS[0])],
    photo: index % 3,
    ...overrides,
  };
}

/**
 * The backend allows ballot numbers 1–3 and opens voting with exactly 3 complete candidates.
 * `one` and `six` exist only to test layouts (the mock sets their state directly).
 */
export const CANDIDATE_SETS = {
  default: [0, 1, 2].map((i) => candidate(i)),
  none: [],
  'missing-photo': [candidate(0), candidate(1), candidate(2, { photo: null })],
  one: [candidate(0)],
  six: [0, 1, 2, 3, 4, 5].map((i) => candidate(i)),
  long: [
    candidate(0, { fullName: 'Muhammad Rizky Pratama Wicaksono Adiwijaya Putra Nugraha' }),
    candidate(1, { fullName: 'Anak Agung Ayu Putri Saraswati Dewi Kusumawardhani' }),
    candidate(2),
  ],
} satisfies Record<string, CandidateFixture[]>;

export type CandidateSet = keyof typeof CANDIDATE_SETS;

function demoMember(
  nim: string,
  name: string,
  email: string,
  extra: Partial<MemberFixture> = {},
): MemberFixture {
  return {
    nim,
    name,
    email,
    password: DEMO_PASSWORD.voter,
    isVoter: true,
    votedInitially: false,
    department: 'Back End',
    classYear: 2023,
    studyProgram: 'Informatics Engineering',
    ...extra,
  };
}

/** Builds the member register: demo accounts first, then generated members up to `total` voters. */
export function buildMembers(totalVoters: number): MemberFixture[] {
  const demo: MemberFixture[] = [
    demoMember(DEMO_ACCOUNTS.voterNim, 'Demo Voter', DEMO_ACCOUNTS.voter),
    demoMember('235150200111002', 'Demo Voter Two', DEMO_ACCOUNTS.voter2),
    demoMember('235150200111003', 'Demo Voted', DEMO_ACCOUNTS.voted, { votedInitially: true }),
    demoMember('235150200111004', 'Demo Guest', DEMO_ACCOUNTS.guest, { isVoter: false }),
    demoMember('235150200111005', 'Two-step Demo', DEMO_ACCOUNTS.otp, { sso: 'otp' }),
    demoMember('235150200111006', 'Demo SSO Down', DEMO_ACCOUNTS.ssoDown, {
      isVoter: false,
      sso: 'down',
    }),
    demoMember('235150200111007', 'Demo SSO Busy', DEMO_ACCOUNTS.ssoBusy, {
      isVoter: false,
      sso: 'busy',
    }),
  ];
  const demoVoters = demo.filter((m) => m.isVoter).length;
  const generated: MemberFixture[] = Array.from(
    { length: Math.max(0, totalVoters - demoVoters) },
    (_, i) => {
      const n = String(i + 1).padStart(3, '0');
      return {
        nim: `23515020${String(i + 1).padStart(7, '0')}`,
        name: `Member ${n}`,
        // Some register rows have no email until the member signs in once (backend doc).
        email: i % 25 === 24 ? null : `member${n}@student.ub.ac.id`,
        password: DEMO_PASSWORD.voter,
        isVoter: true,
        votedInitially: false,
        department: DEPARTMENTS[i % DEPARTMENTS.length] ?? DEPARTMENTS[0],
        classYear: 2022 + (i % 4),
        studyProgram: MAJORS[i % MAJORS.length] ?? MAJORS[0],
      };
    },
  );
  return [...demo, ...generated];
}

export const DEFAULT_VOTER_COUNT = 139;
