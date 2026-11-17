/** Scenario and data-set names, safe to import from client code (no mock database). */
import * as z from 'zod/mini';

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

export const CANDIDATE_SET_NAMES = [
  'default',
  'none',
  'missing-photo',
  'one',
  'six',
  'long',
] as const;

export const VOTER_COUNT_OPTIONS = [139, 1000] as const;

export const scenarioSchema = z.enum(SCENARIOS);

export const dataOptionsSchema = z.object({
  candidateSet: z.optional(z.enum(CANDIDATE_SET_NAMES)),
  voterCount: z.optional(z.int().check(z.minimum(1), z.maximum(5000))),
});

export const scenarioBodySchema = z.object({
  scenario: scenarioSchema,
  data: z.optional(dataOptionsSchema),
});
