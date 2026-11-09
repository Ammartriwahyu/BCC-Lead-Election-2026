/**
 * Wire format (DTO) schemas. ASSUMED until the backend docs arrive: see docs/API_CONTRACT.md.
 * Every response is validated here before it reaches the app.
 */
import { z } from 'zod';

import './zodConfig';

export const electionStateSchema = z.enum(['NOT_STARTED', 'OPEN', 'CLOSED']);
export const voterStatusSchema = z.enum(['NOT_VOTED', 'VOTED']);
export const displayScreenSchema = z.enum([
  'OPENS_SOON',
  'VOTING_OPEN',
  'VOTING_CLOSED',
  'WINNER_REVEAL',
  'FINAL_RESULTS',
  'MOST_VOTES',
]);

export const errorCodeSchema = z.enum([
  'INVALID_CREDENTIALS',
  'NOT_A_VOTER',
  'ALREADY_VOTED',
  'VOTING_NOT_OPEN',
  'VOTING_CLOSED',
  'STATE_CONFLICT',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'RESULTS_LOCKED',
  'VALIDATION',
  'NETWORK',
  'TIMEOUT',
  'UNKNOWN',
]);

export const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string().optional(),
    field: z.string().optional(),
  }),
});

const isoDate = z.iso.datetime({ offset: true });

export const electionDtoSchema = z.object({
  state: electionStateSchema,
  /** Monotonic counter, bumped on every state change. */
  version: z.number().int().nonnegative(),
  updatedAt: isoDate,
});

export const voterMeDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  status: voterStatusSchema,
  submittedAt: isoDate.nullable(),
});

export const voterSessionDtoSchema = z.object({
  voter: voterMeDtoSchema,
  election: electionDtoSchema,
});

export const candidateDtoSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  name: z.string(),
  major: z.string(),
  classYear: z.number().int(),
  photoUrl: z.string().nullable(),
  vision: z.string(),
  missions: z.array(z.string()),
});

export const candidatesDtoSchema = z.object({ items: z.array(candidateDtoSchema) });

export const voteReceiptDtoSchema = z.object({ submittedAt: isoDate });

export const adminMeDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export const adminSessionDtoSchema = z.object({ admin: adminMeDtoSchema });

export const displayControlDtoSchema = z.object({
  activeScreen: displayScreenSchema,
  version: z.number().int().nonnegative(),
});

export const adminOverviewDtoSchema = z.object({
  election: electionDtoSchema,
  registeredVoters: z.number().int().nonnegative(),
  votesReceived: z.number().int().nonnegative(),
  display: displayControlDtoSchema,
});

export const adminVoterDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  status: voterStatusSchema,
});

export const adminVotersDtoSchema = z.object({
  items: z.array(adminVoterDtoSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  registeredVoters: z.number().int().nonnegative(),
  votesReceived: z.number().int().nonnegative(),
  election: electionDtoSchema,
});

export const candidateTallyDtoSchema = z.object({
  candidateId: z.string(),
  number: z.number().int().positive(),
  name: z.string(),
  major: z.string(),
  classYear: z.number().int(),
  photoUrl: z.string().nullable(),
  votes: z.number().int().nonnegative(),
});

export const adminResultsDtoSchema = z.object({
  election: electionDtoSchema,
  registeredVoters: z.number().int().nonnegative(),
  candidates: z.array(candidateTallyDtoSchema),
  display: displayControlDtoSchema,
});

const displayCandidateDtoSchema = z.object({
  number: z.number().int().positive(),
  name: z.string(),
  photoUrl: z.string().nullable(),
});

const displayTotalsDtoSchema = z.object({
  votesReceived: z.number().int().nonnegative(),
  registeredVoters: z.number().int().nonnegative(),
});

/** /display gets only the payload of the screen on air. Totals per candidate only on result screens. */
export const displayPayloadDtoSchema = z.discriminatedUnion('screen', [
  z.object({
    screen: z.literal('OPENS_SOON'),
    version: z.number().int(),
    candidates: z.array(displayCandidateDtoSchema),
  }),
  z.object({
    screen: z.literal('VOTING_OPEN'),
    version: z.number().int(),
    totals: displayTotalsDtoSchema,
  }),
  z.object({
    screen: z.literal('VOTING_CLOSED'),
    version: z.number().int(),
    totals: displayTotalsDtoSchema,
  }),
  z.object({
    screen: z.literal('WINNER_REVEAL'),
    version: z.number().int(),
    totals: displayTotalsDtoSchema,
  }),
  z.object({
    screen: z.literal('FINAL_RESULTS'),
    version: z.number().int(),
    totals: displayTotalsDtoSchema,
    candidates: z.array(candidateTallyDtoSchema.omit({ candidateId: true })),
  }),
  z.object({
    screen: z.literal('MOST_VOTES'),
    version: z.number().int(),
    totals: displayTotalsDtoSchema,
    candidates: z.array(candidateTallyDtoSchema.omit({ candidateId: true })),
  }),
]);

/* ---------- Request bodies ---------- */

export const signInBodySchema = z.object({
  email: z.string(),
  password: z.string(),
});

export const voteBodySchema = z.object({
  candidateId: z.string().min(1),
  expectedState: z.literal('OPEN'),
});

export const electionActionSchema = z.enum(['open', 'close', 'reopen']);

export const electionActionBodySchema = z.object({ expectedState: electionStateSchema });

export const displayBodySchema = z.object({
  screen: displayScreenSchema,
  expectedVersion: z.number().int().nonnegative(),
});

export type ElectionDto = z.infer<typeof electionDtoSchema>;
export type VoterMeDto = z.infer<typeof voterMeDtoSchema>;
export type CandidateDto = z.infer<typeof candidateDtoSchema>;
export type CandidateTallyDto = z.infer<typeof candidateTallyDtoSchema>;
export type AdminVoterDto = z.infer<typeof adminVoterDtoSchema>;
export type DisplayPayloadDto = z.infer<typeof displayPayloadDtoSchema>;
export type DisplayControlDto = z.infer<typeof displayControlDtoSchema>;
