/**
 * The API contract in one place: every backend endpoint the frontend uses, with method, path,
 * who may call it, request and response schemas, success status and error codes.
 * Source: the backend doc "API Pilketum BCC" (docs/API_CONTRACT.md).
 *
 * Paths are relative to `/api` (the browser calls same-origin `/api/...`; the Next server forwards
 * to `${API_BASE_URL}/api/...` and adds the Bearer token, see lib/bff).
 *
 * Used by: lib/api/endpoints.ts (paths, response schemas), lib/bff (which calls are allowed, which
 * start or end a session), the mock backend handlers (same paths), scripts/build-openapi.ts
 * (docs/openapi.json) and scripts/check-backend.ts (live check).
 */
import * as z from 'zod/mini';

import { API_ROUTES } from './routes';
import {
  adminLoginBodySchema,
  adminMeDtoSchema,
  adminOverviewDtoSchema,
  adminResultsDtoSchema,
  adminSessionDtoSchema,
  adminVotersDtoSchema,
  candidateBodySchema,
  candidateDtoSchema,
  candidatesDtoSchema,
  displayBodySchema,
  displayChangeDtoSchema,
  displayPayloadDtoSchema,
  electionActionBodySchema,
  electionActionSchema,
  electionDtoSchema,
  electionStateDtoSchema,
  healthDtoSchema,
  otpBodySchema,
  selectableScreenWireSchema,
  voteBodySchema,
  voteReceiptDtoSchema,
  voterLoginBodySchema,
  voterLoginDtoSchema,
  voterMeDtoSchema,
  voterSessionDtoSchema,
} from './schemas';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
/** public = no token; voter / admin = Bearer token of that role (held by the Next server). */
export type EndpointAuth = 'public' | 'voter' | 'admin';
export type SessionRole = 'voter' | 'admin';

export interface EndpointSpec {
  method: HttpMethod;
  /** OpenAPI style, relative to `/api`: `/admin/candidates/{id}`. */
  path: string;
  auth: EndpointAuth;
  /** JSON body, or a multipart form (`multipart: 'photo'` names the file field). */
  body?: z.core.$ZodType;
  /** The JSON body may be left out. */
  bodyOptional?: boolean;
  multipart?: string;
  /** Path parameters (`{name}` in `path`). */
  params?: Record<string, z.core.$ZodType>;
  query?: Record<string, z.core.$ZodType>;
  /** Success status and JSON body (`null` = no body or a file). */
  status: number;
  response: z.core.$ZodType | null;
  /** The success body is a file download (Content-Disposition). */
  file?: { contentType: string };
  /** Server-sent events: `event` name and the schema of each message. */
  stream?: { event: string; data: z.core.$ZodType };
  /** Backend error codes this endpoint may answer (UNAUTHORIZED / FORBIDDEN implied when authed). */
  errors: readonly string[];
  /** Success returns a token: the Next server stores it as this role's session and hides it. */
  startsSession?: SessionRole;
  /** Ends this role's session (the Next server clears the cookie whatever the backend answers). */
  endsSession?: SessionRole;
  /** Exists only on the Next server; forwarded to `upstreamPath` on the backend. */
  bffOnly?: { upstreamPath: string };
}

const CANDIDATE_ID = z.string().check(z.regex(/^\d+$/));
const PAGE = z.int().check(z.positive());

export const ENDPOINTS = {
  /* ----- public ----- */
  getHealth: {
    ...API_ROUTES.getHealth,
    auth: 'public',
    status: 200,
    response: healthDtoSchema,
    errors: [],
  },
  getElection: {
    ...API_ROUTES.getElection,
    auth: 'public',
    status: 200,
    response: electionDtoSchema,
    errors: [],
  },
  getDisplay: {
    ...API_ROUTES.getDisplay,
    auth: 'public',
    status: 200,
    response: displayPayloadDtoSchema,
    errors: [],
  },
  streamDisplay: {
    ...API_ROUTES.streamDisplay,
    auth: 'public',
    status: 200,
    response: null,
    stream: { event: 'display', data: displayPayloadDtoSchema },
    errors: ['TOO_MANY_STREAMS', 'STREAM_UNAVAILABLE'],
  },

  /* ----- voter ----- */
  voterSignIn: {
    ...API_ROUTES.voterSignIn,
    auth: 'public',
    body: voterLoginBodySchema,
    status: 200,
    response: voterLoginDtoSchema,
    errors: [
      'INVALID_CREDENTIALS',
      'NOT_REGISTERED',
      'RATE_LIMITED',
      'SSO_UNAVAILABLE',
      'SSO_BUSY',
      'BAD_REQUEST',
    ],
    startsSession: 'voter',
  },
  voterOtp: {
    ...API_ROUTES.voterOtp,
    auth: 'public',
    body: otpBodySchema,
    status: 200,
    response: voterSessionDtoSchema,
    errors: ['OTP_INVALID', 'OTP_EXPIRED', 'RATE_LIMITED', 'SSO_UNAVAILABLE', 'SSO_BUSY'],
    startsSession: 'voter',
  },
  voterSignOut: {
    ...API_ROUTES.voterSignOut,
    auth: 'voter',
    status: 204,
    response: null,
    errors: [],
    endsSession: 'voter',
  },
  getMe: {
    ...API_ROUTES.getMe,
    auth: 'voter',
    status: 200,
    response: voterMeDtoSchema,
    errors: [],
  },
  streamElection: {
    ...API_ROUTES.streamElection,
    auth: 'voter',
    status: 200,
    response: null,
    stream: { event: 'election', data: electionDtoSchema },
    errors: ['TOO_MANY_STREAMS', 'STREAM_UNAVAILABLE'],
  },
  getCandidates: {
    ...API_ROUTES.getCandidates,
    auth: 'voter',
    status: 200,
    response: candidatesDtoSchema,
    errors: [],
  },
  submitVote: {
    ...API_ROUTES.submitVote,
    auth: 'voter',
    body: voteBodySchema,
    status: 201,
    response: voteReceiptDtoSchema,
    errors: ['VOTING_NOT_OPEN', 'ALREADY_VOTED', 'NOT_FOUND'],
  },

  /* ----- committee ----- */
  adminSignIn: {
    ...API_ROUTES.adminSignIn,
    auth: 'public',
    body: adminLoginBodySchema,
    status: 200,
    response: adminSessionDtoSchema,
    errors: ['INVALID_CREDENTIALS', 'RATE_LIMITED'],
    startsSession: 'admin',
  },
  adminSignOut: {
    ...API_ROUTES.adminSignOut,
    auth: 'admin',
    status: 204,
    response: null,
    errors: [],
    endsSession: 'admin',
    bffOnly: { upstreamPath: '/auth/logout' },
  },
  getAdminMe: {
    ...API_ROUTES.getAdminMe,
    auth: 'admin',
    status: 200,
    response: adminMeDtoSchema,
    errors: [],
  },
  getAdminOverview: {
    ...API_ROUTES.getAdminOverview,
    auth: 'admin',
    status: 200,
    response: adminOverviewDtoSchema,
    errors: [],
  },
  streamAdmin: {
    ...API_ROUTES.streamAdmin,
    auth: 'admin',
    status: 200,
    response: null,
    stream: { event: 'overview', data: adminOverviewDtoSchema },
    errors: ['TOO_MANY_STREAMS', 'STREAM_UNAVAILABLE'],
  },
  changeElectionState: {
    ...API_ROUTES.changeElectionState,
    auth: 'admin',
    params: { action: electionActionSchema },
    body: electionActionBodySchema,
    bodyOptional: true,
    status: 200,
    response: electionStateDtoSchema,
    errors: ['INVALID_STATE', 'CANDIDATES_INCOMPLETE'],
  },
  setDisplayScreen: {
    ...API_ROUTES.setDisplayScreen,
    auth: 'admin',
    body: displayBodySchema,
    status: 200,
    response: displayChangeDtoSchema,
    errors: ['RESULTS_LOCKED', 'INVALID_SCREEN', 'DISPLAY_CHANGED'],
  },
  previewDisplay: {
    ...API_ROUTES.previewDisplay,
    auth: 'admin',
    query: { screen: z.optional(selectableScreenWireSchema) },
    status: 200,
    response: displayPayloadDtoSchema,
    errors: ['RESULTS_LOCKED', 'INVALID_SCREEN'],
  },
  getAdminVoters: {
    ...API_ROUTES.getAdminVoters,
    auth: 'admin',
    query: {
      page: z.optional(PAGE),
      per_page: z.optional(PAGE),
      search: z.optional(z.string()),
      status: z.optional(z.enum(['voted', 'not_voted'])),
    },
    status: 200,
    response: adminVotersDtoSchema,
    errors: [],
  },
  getAdminResults: {
    ...API_ROUTES.getAdminResults,
    auth: 'admin',
    status: 200,
    response: adminResultsDtoSchema,
    errors: ['RESULTS_LOCKED'],
  },
  exportResults: {
    ...API_ROUTES.exportResults,
    auth: 'admin',
    status: 200,
    response: null,
    file: { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    errors: ['RESULTS_LOCKED'],
  },
  getAdminCandidates: {
    ...API_ROUTES.getAdminCandidates,
    auth: 'admin',
    status: 200,
    response: candidatesDtoSchema,
    errors: [],
  },
  getAdminCandidate: {
    ...API_ROUTES.getAdminCandidate,
    auth: 'admin',
    params: { id: CANDIDATE_ID },
    status: 200,
    response: candidateDtoSchema,
    errors: ['NOT_FOUND'],
  },
  createCandidate: {
    ...API_ROUTES.createCandidate,
    auth: 'admin',
    body: candidateBodySchema,
    status: 201,
    response: candidateDtoSchema,
    errors: ['VALIDATION_FAILED', 'BALLOT_NUMBER_TAKEN', 'CANDIDATES_LOCKED'],
  },
  updateCandidate: {
    ...API_ROUTES.updateCandidate,
    auth: 'admin',
    params: { id: CANDIDATE_ID },
    body: candidateBodySchema,
    status: 200,
    response: candidateDtoSchema,
    errors: ['VALIDATION_FAILED', 'BALLOT_NUMBER_TAKEN', 'CANDIDATES_LOCKED', 'NOT_FOUND'],
  },
  deleteCandidate: {
    ...API_ROUTES.deleteCandidate,
    auth: 'admin',
    params: { id: CANDIDATE_ID },
    status: 204,
    response: null,
    errors: ['CANDIDATES_LOCKED', 'NOT_FOUND'],
  },
  uploadCandidatePhoto: {
    ...API_ROUTES.uploadCandidatePhoto,
    auth: 'admin',
    params: { id: CANDIDATE_ID },
    multipart: 'photo',
    status: 200,
    response: candidateDtoSchema,
    errors: ['PHOTO_TOO_LARGE', 'PHOTO_INVALID', 'CANDIDATES_LOCKED', 'NOT_FOUND'],
  },
  deleteCandidatePhoto: {
    ...API_ROUTES.deleteCandidatePhoto,
    auth: 'admin',
    params: { id: CANDIDATE_ID },
    status: 200,
    response: candidateDtoSchema,
    errors: ['CANDIDATES_LOCKED', 'NOT_FOUND'],
  },
} as const satisfies Record<string, EndpointSpec>;

export type EndpointName = keyof typeof ENDPOINTS;

export { pathFor, routePattern } from './routes';

/** HTTP status per backend error code (backend doc, "Daftar kode error"). */
export const ERROR_STATUS: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  OTP_INVALID: 401,
  OTP_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_REGISTERED: 403,
  NOT_FOUND: 404,
  VOTING_NOT_OPEN: 409,
  ALREADY_VOTED: 409,
  CANDIDATES_LOCKED: 409,
  MEMBERS_LOCKED: 409,
  BALLOT_NUMBER_TAKEN: 409,
  CANDIDATES_INCOMPLETE: 409,
  INVALID_STATE: 409,
  RESULTS_LOCKED: 409,
  DISPLAY_CHANGED: 409,
  PHOTO_TOO_LARGE: 413,
  VALIDATION_FAILED: 422,
  PHOTO_INVALID: 422,
  INVALID_SCREEN: 422,
  RATE_LIMITED: 429,
  TOO_MANY_STREAMS: 429,
  INTERNAL_ERROR: 500,
  SSO_UNAVAILABLE: 502,
  SSO_BUSY: 503,
  STREAM_UNAVAILABLE: 503,
};

const MATCHERS = (Object.entries(ENDPOINTS) as [EndpointName, EndpointSpec][]).map(
  ([name, spec]) => ({
    name,
    spec,
    regex: new RegExp(`^${spec.path.replace(/\{\w+\}/g, '[^/]+')}$`),
  }),
);

/** The registry entry for a method + path (relative to `/api`), or undefined. */
export function matchEndpoint(
  method: string,
  path: string,
): { name: EndpointName; spec: EndpointSpec } | undefined {
  const upper = method.toUpperCase();
  const found = MATCHERS.find((m) => m.spec.method === upper && m.regex.test(path));
  return found ? { name: found.name, spec: found.spec } : undefined;
}
