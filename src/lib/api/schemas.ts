/**
 * Wire format (DTO) schemas of the Pilketum backend API (docs/API_CONTRACT.md, backend doc
 * "API Pilketum BCC"). snake_case, lowercase enums, ISO-8601 UTC dates. Every response is validated
 * here before it reaches the app; endpoints.ts maps DTOs to the domain types in types.ts.
 * Written with `zod/mini` (functional API) to keep the client bundle small (PLAN, JS budget).
 */
import * as z from 'zod/mini';

import './zodConfig';

/** Non-negative integer (counts). */
const count = () => z.int().check(z.nonnegative());
/** Positive integer (ids, ballot numbers, pages). */
const positiveInt = () => z.int().check(z.positive());
const isoDate = z.iso.datetime({ offset: true });

/**
 * A list in a response. The backend (Go) leaves an empty list out or sends `null`; both mean [].
 * Seen on GET /display (`voting_opens_soon` without `candidates` while there are none).
 */
function list<T extends z.core.$ZodType>(item: T) {
  return z.pipe(
    z.optional(z.nullable(z.array(item))),
    z.transform((value: z.output<T>[] | null | undefined): z.output<T>[] => value ?? []),
  );
}

/* ---------- Enums ---------- */

export const electionStatusSchema = z.enum(['not_started', 'open', 'closed']);

export const displayScreenWireSchema = z.enum([
  'voting_opens_soon',
  'voting_open',
  'voting_closed',
  'winner_suspense',
  'final_results',
  'most_votes',
]);

/** Screens the committee may put on air (PUT /admin/display); the rest follow the voting status. */
export const selectableScreenWireSchema = z.enum([
  'voting_closed',
  'winner_suspense',
  'final_results',
  'most_votes',
]);

export const electionActionSchema = z.enum(['open', 'close', 'reopen']);

/* ---------- Errors ---------- */

/** `{ error: { code, message, fields? } }`; OTP_INVALID adds a new `flow` and `devices`. */
export const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.optional(z.string()),
    fields: z.optional(z.record(z.string(), z.string())),
  }),
  flow: z.optional(z.string()),
  devices: z.optional(z.array(z.unknown())),
});

/* ---------- Shared pieces ---------- */

export const turnoutDtoSchema = z.object({
  registered: count(),
  voted: count(),
  not_voted: count(),
  /** Rounded to 1 decimal by the backend. The app recomputes from the counts. */
  percent: z.number(),
});

export const electionDtoSchema = z.object({
  status: electionStatusSchema,
  server_time: z.optional(isoDate),
});

export const voterDtoSchema = z.object({
  nim: z.string(),
  name: z.string(),
  email: z.nullable(z.string()),
  class_year: z.optional(z.nullable(z.int())),
  study_program: z.optional(z.nullable(z.string())),
  department: z.optional(z.nullable(z.string())),
  has_voted: z.boolean(),
});

export const otpDeviceDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  default: z.boolean(),
});

/* ---------- Auth ---------- */

/**
 * Successful sign-in. `token` / `expires_at` come from the backend; the Next server keeps them in an
 * httpOnly cookie and removes them before the browser sees the body, so they are optional here.
 */
export const voterSessionDtoSchema = z.object({
  token: z.optional(z.string()),
  expires_at: z.optional(isoDate),
  voter: voterDtoSchema,
  election: electionDtoSchema,
});

export const otpChallengeDtoSchema = z.object({
  otp_required: z.literal(true),
  /** One-time, 5 minutes. Needed to send the code. */
  flow: z.string(),
  devices: list(otpDeviceDtoSchema),
});

export const voterLoginDtoSchema = z.union([otpChallengeDtoSchema, voterSessionDtoSchema]);

export const voterMeDtoSchema = z.object({
  voter: voterDtoSchema,
  election: electionDtoSchema,
});

export const adminSessionDtoSchema = z.object({
  token: z.optional(z.string()),
  expires_at: z.optional(isoDate),
  username: z.string(),
});

export const adminMeDtoSchema = z.object({ username: z.string() });

/* ---------- Candidates ---------- */

export const candidateDtoSchema = z.object({
  id: positiveInt(),
  ballot_number: positiveInt(),
  full_name: z.string(),
  study_program: z.string(),
  class_year: z.int(),
  vision: z.string(),
  missions: list(z.string()),
  photo_url: z.nullable(z.string()),
});

export const candidatesDtoSchema = z.object({ candidates: list(candidateDtoSchema) });

/** Ballot entry with the vote count (results, result screens). Extra fields are ignored. */
export const candidateResultDtoSchema = z.object({
  id: positiveInt(),
  ballot_number: positiveInt(),
  full_name: z.string(),
  study_program: z.string(),
  class_year: z.int(),
  photo_url: z.nullable(z.string()),
  votes: count(),
  /** Percent of valid votes, 1 decimal. */
  share: z.number(),
  /** Shared ranking: 1, 1, 3. */
  rank: positiveInt(),
});

export const voteReceiptDtoSchema = z.object({ voted: z.literal(true) });

/* ---------- Committee ---------- */

export const electionStateDtoSchema = z.object({
  status: electionStatusSchema,
  display_screen: displayScreenWireSchema,
  opened_at: z.nullable(isoDate),
  closed_at: z.nullable(isoDate),
});

export const adminOverviewDtoSchema = z.object({
  status: electionStatusSchema,
  display_screen: displayScreenWireSchema,
  opened_at: z.nullable(isoDate),
  closed_at: z.nullable(isoDate),
  /** Number of candidates only. Never votes per candidate. */
  candidates: count(),
  turnout: turnoutDtoSchema,
});

/** PUT /admin/display: the doc gives no response body (BACKEND_QUESTIONS); anything 2xx is fine. */
export const displayChangeDtoSchema = z.looseObject({});

export const adminVoterDtoSchema = z.object({
  nim: z.string(),
  name: z.string(),
  email: z.nullable(z.string()),
  department: z.optional(z.nullable(z.string())),
  class_year: z.optional(z.nullable(z.int())),
  has_voted: z.boolean(),
});

export const adminVotersDtoSchema = z.object({
  voters: z.object({
    items: list(adminVoterDtoSchema),
    page: positiveInt(),
    per_page: positiveInt(),
    total: count(),
    total_pages: count(),
  }),
  turnout: turnoutDtoSchema,
});

export const adminResultsDtoSchema = z.object({
  status: electionStatusSchema,
  display_screen: displayScreenWireSchema,
  results: z.object({
    total_votes: count(),
    turnout: turnoutDtoSchema,
    candidates: list(candidateResultDtoSchema),
    leaders: list(positiveInt()),
    top_tied: z.boolean(),
    /** Ballots = members who voted. false: do not announce, call the backend team. */
    integrity_ok: z.boolean(),
  }),
});

export const healthDtoSchema = z.object({ ok: z.boolean() });

/* ---------- Public display ---------- */

const displayCandidateDtoSchema = z.object({
  id: positiveInt(),
  ballot_number: positiveInt(),
  full_name: z.string(),
  study_program: z.string(),
  class_year: z.int(),
  photo_url: z.nullable(z.string()),
});

/** /display gets only the payload of the screen on air. Votes per candidate only on result screens. */
export const displayPayloadDtoSchema = z.discriminatedUnion('screen', [
  z.object({
    screen: z.literal('voting_opens_soon'),
    status: electionStatusSchema,
    candidates: list(displayCandidateDtoSchema),
  }),
  z.object({
    screen: z.literal('voting_open'),
    status: electionStatusSchema,
    turnout: turnoutDtoSchema,
  }),
  z.object({
    screen: z.literal('voting_closed'),
    status: electionStatusSchema,
    turnout: turnoutDtoSchema,
  }),
  z.object({
    screen: z.literal('winner_suspense'),
    status: electionStatusSchema,
    turnout: turnoutDtoSchema,
    total_votes: count(),
    /** Line-up only: no votes before the result. */
    candidates: list(displayCandidateDtoSchema),
  }),
  z.object({
    screen: z.literal('final_results'),
    status: electionStatusSchema,
    turnout: turnoutDtoSchema,
    total_votes: count(),
    top_tied: z.boolean(),
    results: list(candidateResultDtoSchema),
  }),
  z.object({
    screen: z.literal('most_votes'),
    status: electionStatusSchema,
    turnout: turnoutDtoSchema,
    total_votes: count(),
    top_tied: z.boolean(),
    /** Rank-1 candidates (several on a tie, empty with zero votes). */
    winners: list(candidateResultDtoSchema),
  }),
]);

/* ---------- Request bodies ---------- */

export const voterLoginBodySchema = z.object({
  /** NIM or UB email. */
  username: z.string(),
  password: z.string(),
});

export const otpBodySchema = z.object({
  flow: z.string(),
  code: z.string(),
  device_id: z.optional(z.string()),
});

export const adminLoginBodySchema = z.object({ username: z.string(), password: z.string() });

export const voteBodySchema = z.object({ candidate_id: positiveInt() });

export const displayBodySchema = z.object({ screen: selectableScreenWireSchema });

/** Same body for create and update (all fields sent again). Backend limits in the doc. */
export const candidateBodySchema = z.object({
  ballot_number: positiveInt(),
  full_name: z.string(),
  study_program: z.string(),
  class_year: z.int(),
  vision: z.string(),
  missions: z.array(z.string()),
});

export type ElectionStatusDto = z.infer<typeof electionStatusSchema>;
export type DisplayScreenDto = z.infer<typeof displayScreenWireSchema>;
export type TurnoutDto = z.infer<typeof turnoutDtoSchema>;
export type ElectionDto = z.infer<typeof electionDtoSchema>;
export type VoterDto = z.infer<typeof voterDtoSchema>;
export type CandidateDto = z.infer<typeof candidateDtoSchema>;
export type CandidateResultDto = z.infer<typeof candidateResultDtoSchema>;
export type DisplayPayloadDto = z.infer<typeof displayPayloadDtoSchema>;
export type AdminVoterDto = z.infer<typeof adminVoterDtoSchema>;
export type CandidateBodyDto = z.infer<typeof candidateBodySchema>;
