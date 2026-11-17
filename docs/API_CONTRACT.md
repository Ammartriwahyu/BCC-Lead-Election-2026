# API contract

Source: the backend team's doc **"API Pilketum BCC"** (received 17 Nov 2026). This file says how the frontend uses it; open points are in `docs/BACKEND_QUESTIONS.md`, the switch-over runbook in `docs/INTEGRATION.md`.

- Source of truth in code: `src/lib/api/contract.ts` (endpoint registry: method, path, role, body, params, status, response schema, error codes), `src/lib/api/schemas.ts` (Zod wire schemas), `src/lib/api/endpoints.ts` (wire → domain mapping), `src/mocks/handlers.ts` (mock backend, paths from the registry).
- Generated: `docs/openapi.json` (OpenAPI 3.1, `pnpm contract:openapi`; CI fails when stale). Do not edit by hand.
- Tests: `contract.test.ts` (registry ↔ mock handlers), `endpoints.test.ts` (calls through the BFF to the mock), `bff.test.ts`, `contractCheck.test.ts`. Live check against a running backend: `pnpm contract:check <backendOrigin>` (read-only), or `pnpm contract:check --mock`.
- Wire format: JSON, snake_case, lowercase enums, ISO-8601 UTC (`2026-11-20T01:00:00Z`). Every path starts with `/api`.

## How the browser reaches the API (BFF)

The backend authenticates with `Authorization: Bearer <token>` and suggests keeping the token in memory or `sessionStorage`. The frontend does **not** let browser JavaScript see the token (spec: no tokens in storage; booth devices are shared):

```
browser ── same-origin /api/* + httpOnly cookie ──▶ Next server (src/lib/bff) ── Bearer token ──▶ backend /api/*
```

- `POST /api/auth/login`, `/api/auth/otp`, `/api/admin/auth/login`: the Next server forwards, takes `token` / `expires_at` out of the answer, stores the token in an httpOnly cookie (`pilketum_voter_session` / `pilketum_admin_session`, `SameSite=Lax`, `Secure` on https, `Max-Age` from `expires_at`) and gives the rest of the body to the browser.
- Every other registry endpoint is forwarded with the token of its role (`/api/admin/*` → committee cookie, otherwise the voter cookie). No cookie → `401` without calling the backend. A backend `401` also clears the cookie.
- `POST /api/auth/logout` (voter) and `POST /api/admin/auth/logout` (Next-only route for the committee) both call the backend `POST /api/auth/logout` with the right token and always clear the cookie.
- Paths not in the registry answer `404`; state-changing requests from another `Origin` answer `403`.
- `X-Forwarded-For` is passed on so per-IP limits see the voter, not the Next server (BACKEND_QUESTIONS #1).
- Consequences: no CORS needed for the frontend, the CSP keeps `connect-src 'self'`, and `EventSource` works for both streams because the cookie travels with it.

## Auth

| Role      | Sign in                                                                             | Token lifetime | Notes                                                                                      |
| --------- | ----------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| Voter     | `POST /auth/login { username, password }` (NIM or UB email, UB SSO)                 | 2 h            | May answer `{ otp_required, flow, devices }` → `POST /auth/otp { flow, code, device_id? }` |
| Committee | `POST /admin/auth/login { username, password }` → `{ token, expires_at, username }` | 12 h           | A voter token on `/admin/*` is `403 FORBIDDEN` (and vice versa)                            |

Voters can sign in in every status (`not_started`, `open`, `closed`). `OTP_INVALID` returns a new `flow` (and `devices`) for the next try; `OTP_EXPIRED` means start again.

## Errors

`{ "error": { "code", "message", "fields"? } }` (OTP_INVALID adds `flow` and `devices`). The UI acts on `code` only; `errorResponse.ts` maps backend codes to the app's codes:

| Backend code                                                                 | HTTP          | App code                          | UI                                                               |
| ---------------------------------------------------------------------------- | ------------- | --------------------------------- | ---------------------------------------------------------------- |
| `INVALID_CREDENTIALS`                                                        | 401           | same                              | Banner, password cleared                                         |
| `NOT_REGISTERED`                                                             | 403           | `NOT_A_VOTER`                     | Error under "NIM or UB email"                                    |
| `OTP_INVALID` / `OTP_EXPIRED`                                                | 401           | same                              | Field error with the new flow / back to the sign-in form         |
| `RATE_LIMITED` (+ `Retry-After`)                                             | 429           | same (`retryAfterSeconds`)        | "Too many attempts. Try again in N seconds."                     |
| `SSO_UNAVAILABLE` / `SSO_BUSY`                                               | 502–504 / 503 | same                              | Banners                                                          |
| `UNAUTHORIZED`                                                               | 401           | same                              | Clear cache, back to sign-in "session ended"                     |
| `FORBIDDEN`                                                                  | 403           | same                              | Generic error                                                    |
| `VOTING_NOT_OPEN`                                                            | 409           | same                              | Refetch status: `closed` → `/closed`, otherwise stay (read-only) |
| `ALREADY_VOTED`                                                              | 409           | same                              | `/already-voted`                                                 |
| `NOT_FOUND`                                                                  | 404           | same                              | Candidate gone: reload the list / 404 page                       |
| `INVALID_STATE`                                                              | 409           | `STATE_CONFLICT`                  | Toast "Someone else changed the voting state" + refetch          |
| `RESULTS_LOCKED`                                                             | 409           | same                              | "Results are locked"; display change rolled back                 |
| `CANDIDATES_INCOMPLETE`                                                      | 409           | same                              | Open voting dialog shows the reason                              |
| `CANDIDATES_LOCKED` / `MEMBERS_LOCKED`                                       | 409           | `CANDIDATES_LOCKED`               | Toast, back to the read-only list                                |
| `BALLOT_NUMBER_TAKEN`                                                        | 409           | same                              | Error under "Ballot number"                                      |
| `PHOTO_TOO_LARGE` / `PHOTO_INVALID`                                          | 413 / 422     | same                              | Error under "Photo"                                              |
| `VALIDATION_FAILED` (+ `fields`), `BAD_REQUEST`, `INVALID_SCREEN`            | 422 / 400     | `VALIDATION`                      | Field errors (form) or generic error                             |
| `INTERNAL_ERROR`, `TOO_MANY_STREAMS`, `STREAM_UNAVAILABLE`, network, timeout | 5xx / 429     | `UNKNOWN` / `NETWORK` / `TIMEOUT` | Retry; vote → V4 with a `has_voted` check before resending       |

## Endpoints used

Full shapes: `docs/openapi.json`. Mapping notes:

| Endpoint                                           | Frontend use                                                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /election`                                    | Sign-in status strip, voter state polling (every 5 s). `server_time` unused                                                                      |
| `GET /display`, `GET /display/stream`              | `/display` (SSE first, polling every 3 s as fallback). No `version`: a poll answer that started before the latest stream event is dropped        |
| `POST /auth/login`, `/auth/otp`, `/auth/logout`    | Sign-in (V0), OTP step (NEW, no Figma frame), sign-out / booth auto sign-out                                                                     |
| `GET /me`                                          | `has_voted` → V5b; also checked before a vote retry                                                                                              |
| `GET /candidates`                                  | Ballot and the vision & mission page (one candidate is taken from the list; there is no voter `GET /candidates/{id}`)                            |
| `POST /votes { candidate_id }`                     | Final; `201 { voted: true }`. No `Idempotency-Key`: V4 "Try again" checks `has_voted` first. No vote time: V5 shows this device's time, V5b none |
| `GET /admin/me`, `GET /admin/overview`             | Topbar (username), overview polled every 4 s (`/admin/stream` works through the BFF; not used yet)                                               |
| `POST /admin/election/{open,close,reopen}`         | Confirm dialogs. No `expectedState`: a stale action fails with `INVALID_STATE`                                                                   |
| `PUT /admin/display { screen }`                    | Result screens only, only while `closed`. No `expectedVersion`: the last choice wins, other panels follow the poll                               |
| `GET /admin/voters?page&per_page&search`           | Voter list (6 per page, search on name, email or NIM). `email` may be `null`                                                                     |
| `GET /admin/results`, `/admin/results/export`      | Results (shares recomputed from `votes` / `total_votes`), `integrity_ok = false` warning, Excel download (NEW button)                            |
| `/admin/candidates…` (CRUD + `PUT/DELETE …/photo`) | A6–A8. Photo upload is multipart `photo`, sent after the candidate is saved                                                                      |

Lists: a response list the backend leaves out or sends as `null` is read as `[]` (seen on staging: `voting_opens_soon` without `candidates` while there are none).

Screens: `voting_opens_soon` → OPENS_SOON, `voting_open` → VOTING_OPEN, `voting_closed` → VOTING_CLOSED, `winner_suspense` → WINNER_REVEAL, `final_results` → FINAL_RESULTS, `most_votes` → MOST_VOTES (only `winners`; shares use `total_votes`).

Privacy rules kept: candidate totals only on `final_results` / `most_votes` and `GET /admin/results` while `closed`; the frontend never requests results unless the state is `closed`.

## Demo accounts (mock backend only)

Exist only in `src/mocks/fixtures.ts`; never in production builds or the real backend.

| Role                         | Sign in with                              | Password        | Behaviour                            |
| ---------------------------- | ----------------------------------------- | --------------- | ------------------------------------ |
| Voter                        | `voter@bcc.test` or NIM `235150200111001` | `pilketum2026`  | Normal flow                          |
| Second voter                 | `voter2@bcc.test`                         | `pilketum2026`  | Booth hand-over                      |
| Already voted                | `voted@bcc.test`                          | `pilketum2026`  | `/already-voted`                     |
| Not on the register          | `guest@bcc.test`                          | `pilketum2026`  | `NOT_REGISTERED`                     |
| Two-step verification        | `otp@bcc.test`                            | `pilketum2026`  | Code `246810`                        |
| SSO down / busy              | `sso-down@bcc.test` / `sso-busy@bcc.test` | anything        | `SSO_UNAVAILABLE` / `SSO_BUSY`       |
| Wrong password ×5            | any voter                                 | anything else   | Then `RATE_LIMITED` (Retry-After 30) |
| Committee / second committee | `committee` / `committee2`                | `committee2026` | Admin panel, conflicts               |

Mock-only routes (forwarded only in mock builds): `POST /api/__mock/scenario { scenario, data? }`, `POST /api/__mock/reset`, `GET /api/__mock/state`, `GET /api/__mock/uploads/{file}` (candidate photos).
