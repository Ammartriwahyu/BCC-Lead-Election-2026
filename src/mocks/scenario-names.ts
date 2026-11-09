/** Scenario and data-set names, safe to import from client code (no mock database). */
import { z } from 'zod';

export const SCENARIOS = [
  'not-started',
  'open',
  'closed',
  'already-voted',
  'submit-fails',
  'submit-lost-response',
  'closed-mid-vote',
  'reopen',
  'zero-votes',
  'tie',
] as const;

export type ScenarioName = (typeof SCENARIOS)[number];

export const CANDIDATE_SET_NAMES = ['default', 'one', 'six', 'long'] as const;

export const VOTER_COUNT_OPTIONS = [139, 1000] as const;

export const scenarioSchema = z.enum(SCENARIOS);

export const dataOptionsSchema = z.object({
  candidateSet: z.enum(CANDIDATE_SET_NAMES).optional(),
  voterCount: z.number().int().min(1).max(5000).optional(),
});

export const scenarioBodySchema = z.object({
  scenario: scenarioSchema,
  data: dataOptionsSchema.optional(),
});
