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
  candidateSet?: 'default' | 'one' | 'six' | 'long';
  voterCount?: number;
}

/** Resets the shared mock database to a scenario. Every spec starts with this. */
export async function applyScenario(
  request: APIRequestContext,
  scenario: Scenario,
  data?: ScenarioData,
): Promise<void> {
  const response = await request.post('/api/__mock/scenario', {
    data: { scenario, ...(data ? { data } : {}) },
  });
  if (!response.ok()) throw new Error(`applyScenario(${scenario}) failed: ${response.status()}`);
}

export interface MockState {
  election: { state: string; version: number };
  registeredVoters: number;
  votesReceived: number;
  voteRequests: number;
}

export async function getMockState(request: APIRequestContext): Promise<MockState> {
  return (await (await request.get('/api/__mock/state')).json()) as MockState;
}

export const ACCOUNTS = {
  voter: { email: 'voter@bcc.test', password: 'pilketum2026' },
  voter2: { email: 'voter2@bcc.test', password: 'pilketum2026' },
  voted: { email: 'voted@bcc.test', password: 'pilketum2026' },
  guest: { email: 'guest@bcc.test', password: 'pilketum2026' },
  committee: { email: 'committee@bcc.test', password: 'committee2026' },
  committee2: { email: 'committee2@bcc.test', password: 'committee2026' },
} as const;
