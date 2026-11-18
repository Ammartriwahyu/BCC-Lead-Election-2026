import type { APIRequestContext } from '@playwright/test';

export type Scenario =
  | 'not-started'
  | 'open'
  | 'closed'
  | 'already-voted'
  | 'submit-fails'
  | 'submit-lost-response'
  | 'closed-mid-vote'
  | 'reopen'
  | 'zero-votes'
  | 'tie';

export interface ScenarioData {
  candidateSet?: 'default' | 'none' | 'missing-photo' | 'one' | 'six' | 'long';
  voterCount?: number;
}

/** Default data: a scenario without options always starts from these (options stick otherwise). */
const DEFAULT_DATA: Required<ScenarioData> = { candidateSet: 'default', voterCount: 139 };

/** Resets the shared mock database to a scenario. Every spec starts with this. */
export async function applyScenario(
  request: APIRequestContext,
  scenario: Scenario,
  data?: ScenarioData,
): Promise<void> {
  const response = await request.post('/api/__mock/scenario', {
    data: { scenario, data: { ...DEFAULT_DATA, ...data } },
  });
  if (!response.ok()) throw new Error(`applyScenario(${scenario}) failed: ${response.status()}`);
}

export interface MockState {
  status: 'not_started' | 'open' | 'closed';
  displayScreen: string;
  registeredVoters: number;
  votesReceived: number;
  voteRequests: number;
}

export async function getMockState(request: APIRequestContext): Promise<MockState> {
  return (await (await request.get('/api/__mock/state')).json()) as MockState;
}

/** Demo accounts of the mock backend. Voters sign in with NIM or email, the committee by username. */
export const ACCOUNTS = {
  voter: { username: 'voter@bcc.test', password: 'pilketum2026' },
  voterNim: { username: '235150200111001', password: 'pilketum2026' },
  voter2: { username: 'voter2@bcc.test', password: 'pilketum2026' },
  voted: { username: 'voted@bcc.test', password: 'pilketum2026' },
  guest: { username: 'guest@bcc.test', password: 'pilketum2026' },
  otp: { username: 'otp@bcc.test', password: 'pilketum2026' },
  ssoDown: { username: 'sso-down@bcc.test', password: 'pilketum2026' },
  committee: { username: 'committee', password: 'committee2026' },
  committee2: { username: 'committee2', password: 'committee2026' },
} as const;

/** Code the mock accepts for the 2FA demo account. */
export const DEMO_OTP_CODE = '246810';

export interface Account {
  username: string;
  password: string;
}

/** Domain screen names (data-screen on /display) -> what PUT /admin/display takes. */
export const SCREEN_WIRE: Record<string, string> = {
  VOTING_CLOSED: 'voting_closed',
  WINNER_REVEAL: 'winner_suspense',
  FINAL_RESULTS: 'final_results',
  MOST_VOTES: 'most_votes',
};
