/**
 * Demo data for the mock API ONLY. Never imported by production code paths:
 * the mock route is compiled out when NEXT_PUBLIC_API_MOCKING !== 'enabled'
 * (verified by scripts/check-bundle.mjs).
 */
import type { CandidateDto } from '@/lib/api/schemas';

export const DEMO_PASSWORD = {
  voter: 'pilketum2026',
  committee: 'committee2026',
} as const;

export const DEMO_ACCOUNTS = {
  voter: 'voter@bcc.test',
  voter2: 'voter2@bcc.test',
  voted: 'voted@bcc.test',
  guest: 'guest@bcc.test',
  committee: 'committee@bcc.test',
  committee2: 'committee2@bcc.test',
} as const;

export interface MemberFixture {
  id: string;
  name: string;
  email: string;
  password: string;
  /** false = has a BCC account but is not on the voter register (NOT_A_VOTER). */
  isVoter: boolean;
  votedInitially: boolean;
}

export interface CommitteeFixture {
  id: string;
  name: string;
  email: string;
  password: string;
}

export const COMMITTEE: CommitteeFixture[] = [
  {
    id: 'adm-1',
    name: 'Election Committee',
    email: DEMO_ACCOUNTS.committee,
    password: DEMO_PASSWORD.committee,
  },
  {
    id: 'adm-2',
    name: 'Election Committee 2',
    email: DEMO_ACCOUNTS.committee2,
    password: DEMO_PASSWORD.committee,
  },
];

const MAJORS = [
  'Information Systems',
  'Informatics Engineering',
  'Computer Engineering',
  'Information Technology',
  'Information Technology Education',
] as const;

const VISIONS = [
  'BCC should be a place where every member, new or senior, gets real practice and someone to learn from.',
  'A community that ships real projects together and opens its doors to every student at FILKOM.',
  'BCC as the home where curiosity turns into skills, and skills turn into work people can use.',
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
    'Open weekly study rooms with rotating mentors.',
    'Create a shared component library for member projects.',
    'Host a competition bootcamp before every national contest.',
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

function candidate(index: number, name?: string): CandidateDto {
  const n = index + 1;
  return {
    id: `cand-${String(n).padStart(2, '0')}`,
    number: n,
    name: name ?? `Candidate Name ${String(n).padStart(2, '0')}`,
    major: MAJORS[index % MAJORS.length] ?? MAJORS[0],
    classYear: 2023 + (index % 2 === 0 && index > 1 ? 1 : 0),
    photoUrl: null,
    vision: VISIONS[index % VISIONS.length] ?? VISIONS[0],
    missions: [...(MISSIONS[index % MISSIONS.length] ?? MISSIONS[0])],
  };
}

export const CANDIDATE_SETS = {
  default: [0, 1, 2].map((i) => candidate(i)),
  one: [candidate(0)],
  six: [0, 1, 2, 3, 4, 5].map((i) => candidate(i)),
  long: [
    candidate(0, 'Muhammad Rizky Pratama Wicaksono Adiwijaya Putra Nugraha'),
    candidate(1, 'Anak Agung Ayu Putri Saraswati Dewi Kusumawardhani'),
    candidate(2, 'Candidate Name 03'),
  ],
} satisfies Record<string, CandidateDto[]>;

export type CandidateSet = keyof typeof CANDIDATE_SETS;

/** Builds the member register: demo accounts first, then generated members up to `total` voters. */
export function buildMembers(totalVoters: number): MemberFixture[] {
  const demo: MemberFixture[] = [
    {
      id: 'mem-voter',
      name: 'Demo Voter',
      email: DEMO_ACCOUNTS.voter,
      password: DEMO_PASSWORD.voter,
      isVoter: true,
      votedInitially: false,
    },
    {
      id: 'mem-voter2',
      name: 'Demo Voter Two',
      email: DEMO_ACCOUNTS.voter2,
      password: DEMO_PASSWORD.voter,
      isVoter: true,
      votedInitially: false,
    },
    {
      id: 'mem-voted',
      name: 'Demo Voted',
      email: DEMO_ACCOUNTS.voted,
      password: DEMO_PASSWORD.voter,
      isVoter: true,
      votedInitially: true,
    },
    {
      id: 'mem-guest',
      name: 'Demo Guest',
      email: DEMO_ACCOUNTS.guest,
      password: DEMO_PASSWORD.voter,
      isVoter: false,
      votedInitially: false,
    },
  ];
  const demoVoters = demo.filter((m) => m.isVoter).length;
  const generated: MemberFixture[] = Array.from(
    { length: Math.max(0, totalVoters - demoVoters) },
    (_, i) => {
      const n = String(i + 1).padStart(3, '0');
      return {
        id: `mem-${n}`,
        name: `Member ${n}`,
        email: `member${n}@student.ub.ac.id`,
        password: DEMO_PASSWORD.voter,
        isVoter: true,
        votedInitially: false,
      };
    },
  );
  return [...demo, ...generated];
}

export const DEFAULT_VOTER_COUNT = 139;
