# Connecting the real backend

How this frontend talks to the Pilketum API (backend doc "API Pilketum BCC") and what to do when the backend is deployed. The code is already written against that doc; going live means configuration, a live check and a QA pass.

## How the pieces fit

```
component → features/* hook → lib/api/endpoints.ts → lib/api/client.ts → same-origin /api/*
                                      │                                         │
                         lib/api/contract.ts (registry)          app/api/[...path]/route.ts → lib/bff (BFF)
                         lib/api/schemas.ts (Zod, wire)            ├─ mock build: in-process mock backend (src/mocks)
                                                                   └─ real build: fetch(API_BASE_URL + /api/...)
```

- **`src/lib/api/routes.ts`** holds method and path of every backend endpoint (what the browser bundle uses). **`src/lib/api/contract.ts`** adds role, body, params, status, response schema, error codes, and which calls start or end a session; the BFF, the mock handlers, `docs/openapi.json` and the live check read it. A unit test keeps the two in step.
- **`src/lib/api/schemas.ts`** is the wire format (snake_case). **`endpoints.ts`** maps it to the domain types in `types.ts`, so a backend rename stops at `lib/api`.
- **`src/lib/bff/bff.ts`** is the backend-for-frontend. The backend wants `Authorization: Bearer <token>`; the browser never sees the token. Sign-in answers are intercepted, the token goes into an httpOnly cookie, and every other call is forwarded with the right token. Only registry endpoints are forwarded.
- ESLint stops code outside `lib/api` / `lib/bff` from importing `client`, `schemas`, `contract` or `errorResponse`.

## Step by step

### 1. Configure

| Variable                                       | When    | Value                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_MOCKING`                      | build   | `disabled` (`pnpm build` forces it)                                                                                                                                                                                                   |
| `API_BASE_URL`                                 | runtime | Backend **base URL** without `/api`: `https://pilketum.bccdev.id` (production) or `https://pilketum.bccdev.id/staging`. Read on every request; no rebuild needed                                                                      |
| `BFF_SECRET`                                   | runtime | Secret for `X-BFF-Secret`, from the backend team (one for production, one for staging). Server-only; never in the repo or a `NEXT_PUBLIC_*` var. Without it the server logs a warning and per-IP limits see one IP                    |
| `TRUSTED_PROXY_HOPS`                           | runtime | Proxies in front of the Next server that append to `X-Forwarded-For` (default `1`: nginx alone; `2`: e.g. Cloudflare + nginx)                                                                                                         |
| `IMAGE_REMOTE_PATTERNS`                        | build   | Fallback only: photos of the usual shape (`…/uploads/candidates/<file>`) are read from `API_BASE_URL` through `/candidate-photos/<file>`. Other `photo_url` hosts: `https://pilketum.bccdev.id/**` (`next/image` refuses other hosts) |
| `SESSION_COOKIE_VOTER`, `SESSION_COOKIE_ADMIN` | runtime | Optional: names of the frontend's own session cookies (defaults `pilketum_voter_session` / `pilketum_admin_session`)                                                                                                                  |
| `NEXT_PUBLIC_BOOTH_MODE`                       | build   | `true` on booth laptops (default)                                                                                                                                                                                                     |

```bash
IMAGE_REMOTE_PATTERNS=https://pilketum.bccdev.id/** pnpm build
pnpm check:bundle
pnpm check:js
API_BASE_URL=https://pilketum.bccdev.id BFF_SECRET=… pnpm start
```

Local development against staging: put `API_BASE_URL=https://pilketum.bccdev.id/staging`, the staging `BFF_SECRET` and `NEXT_PUBLIC_API_MOCKING=disabled` in the git-ignored `.env.local`, then `pnpm dev`.

Without `API_BASE_URL` every `/api/*` call answers `503` with "No backend: API_BASE_URL is not set on this server", and the server logs it once.

### 2. Check the running backend

The read-only live check calls the backend directly (Bearer tokens, like the BFF) and validates statuses, bodies, error bodies, tokens and every SSE stream against the registry. It never votes, changes the voting state, the display or a candidate.

```bash
pnpm contract:check https://pilketum.bccdev.id/staging
```

The signed-in checks need staging test accounts (`voter1` and the staging committee account; never a real voter's password, the voter must not use 2FA). Put them in the git-ignored `.env.contract.local`, which the script reads (values already in the environment win):

```bash
CONTRACT_VOTER_USERNAME=voter1
CONTRACT_VOTER_PASSWORD=…
CONTRACT_ADMIN_USERNAME=…
CONTRACT_ADMIN_PASSWORD=…
```

`pnpm contract:check --mock` runs the same checks in-process against the mock backend: 26 pass, 9 skipped (writes and the OTP step). That is the baseline.

Writes (vote, open / close / reopen, display, candidate changes, photo upload) are covered by the e2e suite against the mock; on staging test them by hand with the QA checklist (`docs/QA_REPORT.md` §10).

### 3. Things the backend side must allow

- **Client IP** (agreed with the backend team): every request reaches the backend from the Next server, so the BFF adds `X-BFF-Secret` and `X-Client-IP`. The backend trusts `X-Client-IP` only with the right secret. The frontend's own proxy must append the real address to `X-Forwarded-For` (nginx: `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`); the BFF takes the entry `TRUSTED_PROXY_HOPS` from the right, so a header the browser made up is ignored. Login limits are per IP and per IP + username, so one booth room does not lock everyone out.
- **CORS** is not needed: the browser only talks to its own origin, and the backend accepts requests without `Origin`.
- **Streams** (`/api/display/stream`, `/api/election/stream`, `/api/admin/stream`) are not buffered on the backend side (nginx and the BCC proxy, `: ping` every 20 s, read timeout 1 h). The BFF passes the stream through and adds `X-Accel-Buffering: no`; the frontend's own nginx must not buffer (config in `docs/DEPLOY.md`) `/api/display/stream`, `/api/election/stream` or `/api/admin/stream` either (`proxy_buffering off;`, `proxy_read_timeout 1h;`).

### 4. Cookies and sessions (frontend side)

- `pilketum_voter_session` / `pilketum_admin_session`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` behind https (`X-Forwarded-Proto` is honoured), `Max-Age` from `expires_at`.
- `src/proxy.ts` only checks the cookie exists before rendering signed-in pages; a backend `401` clears it and the page returns to sign-in.
- State-changing requests from another origin are refused by the BFF (`403`) on top of `SameSite=Lax`.

### 5. Re-run QA

1. `pnpm contract:check` against staging with test accounts: all pass.
2. Manual pass over `docs/QA_REPORT.md` §10 on staging: sign-in (NIM and email, 2FA account, wrong password, rate limit), a full vote, booth hand-over, committee open / close / reopen, two committee members at once, candidates (add with photo, edit, delete) before opening, every display screen, the stream dropping and coming back, results export.
3. Lighthouse on the staging URL (`pnpm lhci` with the collect URL changed).
4. Log contract changes in `docs/API_CONTRACT.md` and decisions in `docs/PLAN.md`.

## When the backend changes

1. Edit `routes.ts` (path, method) and `contract.ts` (status, error codes, schemas), then `schemas.ts` (wire shape), then the mapper in `endpoints.ts`. Change `types.ts` only if the UI needs new information.
2. Make the mock behave the same (`src/mocks/handlers.ts`, `db.ts`, `fixtures.ts`) so unit and e2e tests keep testing the real contract.
3. `pnpm contract:openapi`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, then `pnpm contract:check` against staging.

## What stays mock-only

`src/mocks/**`, the scenario switcher, `/dev/gallery`, the demo accounts and `/api/__mock/*` are compiled out of `pnpm build` (`pnpm check:bundle` fails otherwise). The mock keeps working for local development and the e2e suite.
