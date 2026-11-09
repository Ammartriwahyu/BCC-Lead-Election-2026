# API contract (ASSUMED)

Everything here is **ASSUMED** until the backend team sends its documentation. When it arrives, compare it with this file, then change only `src/lib/api/*` and `src/mocks/*`.

- Source of truth in code: `src/lib/api/schemas.ts` (Zod DTOs), `src/lib/api/endpoints.ts` (paths + mapping), `src/mocks/handlers.ts` (behaviour). Contract tests: `src/lib/api/endpoints.test.ts`.
- The browser calls same-origin `/api/*`. Paths below are relative to that prefix (backend base URL = `API_BASE_URL`).
- JSON, camelCase, ISO-8601 dates with offset.

## Auth

|                   | ASSUMED                                                                               |
| ----------------- | ------------------------------------------------------------------------------------- |
| Voter session     | httpOnly cookie `pilketum_voter_session`, `SameSite=Lax`, `Path=/`, `Secure` on HTTPS |
| Committee session | httpOnly cookie `pilketum_admin_session` (separate from voter)                        |
| Expiry            | Any endpoint answers `401 { error: { code: "UNAUTHORIZED" } }`                        |

The frontend proxy (`src/proxy.ts`) only checks that the cookie exists. Cookie names must match the backend.

## Errors

`{ "error": { "code": ErrorCode, "message"?: string, "field"?: string } }`

| Code                            | HTTP    | Where                              | UI                                                              |
| ------------------------------- | ------- | ---------------------------------- | --------------------------------------------------------------- |
| `INVALID_CREDENTIALS`           | 401     | sign-in                            | Banner "That email and password don't match…", password cleared |
| `NOT_A_VOTER`                   | 403     | voter sign-in (`field: "email"`)   | Email field error "This email isn't on the voter register."     |
| `ALREADY_VOTED`                 | 409     | `POST /votes`                      | Redirect `/already-voted`                                       |
| `VOTING_NOT_OPEN`               | 409     | `POST /votes`                      | Back to `/candidates` (read-only)                               |
| `VOTING_CLOSED`                 | 409     | `POST /votes`                      | Close dialog, redirect `/closed`                                |
| `STATE_CONFLICT`                | 409     | admin state/display actions        | Toast + refetch                                                 |
| `RESULTS_LOCKED`                | 403     | `GET /admin/results` before CLOSED | "Results are locked"                                            |
| `NOT_FOUND`                     | 404     | `GET /candidates/:id`              | BCC 404                                                         |
| `VALIDATION`                    | 400/422 | bad body                           | Generic error                                                   |
| `UNAUTHORIZED`                  | 401     | any authed endpoint                | Clear cache, redirect to sign-in with "session expired"         |
| `NETWORK`, `TIMEOUT`, `UNKNOWN` | – / 5xx | client-side                        | Retry (queries) / V4 (vote)                                     |

## Endpoints

### Public

| Method | Path              | Response                                                                                                                |
| ------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| GET    | `/election`       | `{ state: "NOT_STARTED"\|"OPEN"\|"CLOSED", version: int, updatedAt }`                                                   |
| GET    | `/display`        | Payload of the screen on air only (see below)                                                                           |
| GET    | `/display/stream` | ASSUMED SSE: `event: display` with the same payload on every change. Optional; frontend falls back to polling every 3 s |

### Voter

| Method | Path                  | Body                                                                        | Response                                                                                         |
| ------ | --------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| POST   | `/auth/voter/sign-in` | `{ email, password }`                                                       | `{ voter: Me, election: Election }` + Set-Cookie                                                 |
| POST   | `/auth/sign-out`      | –                                                                           | 204, cookie cleared                                                                              |
| GET    | `/me`                 | –                                                                           | `Me = { id, name, email, status: "NOT_VOTED"\|"VOTED", submittedAt: iso\|null }`                 |
| GET    | `/candidates`         | –                                                                           | `{ items: Candidate[] }`                                                                         |
| GET    | `/candidates/:id`     | –                                                                           | `Candidate = { id, number, name, major, classYear, photoUrl\|null, vision, missions: string[] }` |
| POST   | `/votes`              | `{ candidateId, expectedState: "OPEN" }` + header `Idempotency-Key: <uuid>` | `201 { submittedAt }`; same key again → `200` same receipt, no second vote                       |

Vote rules: the vote and the voter's `VOTED` flag are stored in one transaction. The response never echoes the candidate.

### Committee (admin)

| Method | Path                                    | Body                          | Response                                                                                                                                                        |
| ------ | --------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/admin/auth/sign-in`                   | `{ email, password }`         | `{ admin: { id, name, email } }` + Set-Cookie                                                                                                                   |
| POST   | `/admin/auth/sign-out`                  | –                             | 204                                                                                                                                                             |
| GET    | `/admin/me`                             | –                             | `{ admin }`                                                                                                                                                     |
| GET    | `/admin/overview`                       | –                             | `{ election, registeredVoters, votesReceived, display: { activeScreen, version } }` — no candidate totals                                                       |
| POST   | `/admin/election/{open\|close\|reopen}` | `{ expectedState }`           | `Election`; `409 STATE_CONFLICT` if the current state ≠ `expectedState` or the transition is invalid                                                            |
| GET    | `/admin/voters?q=&page=`                | –                             | `{ items: [{ id, name, email, status }], page, pageSize, total, registeredVoters, votesReceived, election }`. `q` matches name or email, page is clamped        |
| GET    | `/admin/results`                        | –                             | `{ election, registeredVoters, candidates: [{ candidateId, number, name, major, classYear, photoUrl, votes }], display }`; `403 RESULTS_LOCKED` unless `CLOSED` |
| PUT    | `/admin/display`                        | `{ screen, expectedVersion }` | `{ activeScreen, version }`; `409` if version is stale or the screen is not allowed in the current state                                                        |

Transitions: `open` NOT_STARTED→OPEN, `close` OPEN→CLOSED, `reopen` CLOSED→OPEN (votes kept). Every state change also sets the display screen automatically: NOT_STARTED→`OPENS_SOON`, OPEN→`VOTING_OPEN`, CLOSED→`VOTING_CLOSED`.

Allowed display screens: NOT_STARTED `OPENS_SOON`; OPEN `VOTING_OPEN`; CLOSED `VOTING_CLOSED`, `WINNER_REVEAL`, `FINAL_RESULTS`, `MOST_VOTES`.

### Display payload (`GET /display`)

| `screen`                                        | Extra fields                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `OPENS_SOON`                                    | `candidates: [{ number, name, photoUrl }]`                                     |
| `VOTING_OPEN`, `VOTING_CLOSED`, `WINNER_REVEAL` | `totals: { votesReceived, registeredVoters }`                                  |
| `FINAL_RESULTS`, `MOST_VOTES`                   | `totals` + `candidates: [{ number, name, major, classYear, photoUrl, votes }]` |

All payloads carry `version`. Candidate votes appear only on `FINAL_RESULTS` / `MOST_VOTES`, which require an explicit "Show on display". The frontend computes shares, turnout, leaders and ties (`src/lib/utils/results.ts`).

## Demo accounts (mock API only)

Exist only in `src/mocks/fixtures.ts`; never in production builds or the real backend.

| Role                           | Email                 | Password        | Behaviour                                                 |
| ------------------------------ | --------------------- | --------------- | --------------------------------------------------------- |
| Voter (not voted)              | `voter@bcc.test`      | `pilketum2026`  | Normal flow                                               |
| Second voter (booth hand-over) | `voter2@bcc.test`     | `pilketum2026`  | Same, to check no data from the previous voter is visible |
| Already voted                  | `voted@bcc.test`      | `pilketum2026`  | Redirected to `/already-voted`                            |
| Not a voter                    | `guest@bcc.test`      | `pilketum2026`  | `NOT_A_VOTER`                                             |
| Wrong password                 | any voter email       | anything else   | `INVALID_CREDENTIALS`                                     |
| Committee                      | `committee@bcc.test`  | `committee2026` | Admin panel                                               |
| Second committee               | `committee2@bcc.test` | `committee2026` | Test `STATE_CONFLICT`                                     |

Mock-only control endpoints: `POST /__mock/scenario { scenario, data? }`, `POST /__mock/reset`, `GET /__mock/state`.

## Open questions for the backend team

1. Cookie names, lifetime, and whether sessions are invalidated server-side on sign-out.
2. Is `Idempotency-Key` supported on `POST /votes`, and how long are keys kept?
3. SSE or WebSocket for `/display` and admin turnout? Event names and payload?
4. Does `GET /election` stay public (needed for the sign-in status strip)?
5. Error code names and HTTP statuses — can they match the table above?
6. Candidate photo URLs: same origin, or which host should `next/image` allow?
7. Page size for `/admin/voters` (design shows 6 per page).
8. Are unknown emails reported as `NOT_A_VOTER` (design) or as `INVALID_CREDENTIALS` (avoids account enumeration)?
