/** Client for the mock-only control endpoints (/api/__mock/*). Mock builds only. */
import * as z from 'zod/mini';

import { request } from '@/lib/api/client';
import { electionStatusSchema } from '@/lib/api/schemas';

import { type dataOptionsSchema, scenarioSchema, type ScenarioName } from './scenario-names';

const optionsSchema = z.object({ candidateSet: z.string(), voterCount: z.number() });

const mockStateSchema = z.object({
  options: optionsSchema,
  status: electionStatusSchema,
  displayScreen: z.string(),
  registeredVoters: z.number(),
  votesReceived: z.number(),
  voteRequests: z.number(),
  submitFault: z.string(),
});

export type MockState = z.infer<typeof mockStateSchema>;
export type MockDataOptions = z.infer<typeof dataOptionsSchema>;

export function applyMockScenario(
  scenario: ScenarioName,
  data?: MockDataOptions,
): Promise<unknown> {
  return request('/__mock/scenario', {
    method: 'POST',
    body: { scenario: scenarioSchema.parse(scenario), ...(data ? { data } : {}) },
    schema: z.unknown(),
    skipAuthRedirect: true,
  });
}

export function resetMockData(): Promise<unknown> {
  return request('/__mock/reset', { method: 'POST', schema: z.unknown(), skipAuthRedirect: true });
}

export function getMockState(): Promise<MockState> {
  return request('/__mock/state', { schema: mockStateSchema, skipAuthRedirect: true });
}
