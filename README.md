# Pilketum BCC 2026 — Frontend

E-voting website for the **BCC Chairperson Election 2026** (Basic Computing Community, Universitas Brawijaya):

- **Voter web** — booth devices (desktop/tablet) and phones.
- **Admin panel** — committee laptop (`/admin`).
- **Public display** — videotron/projector page (`/display`), no sign-in.

The backend is built in a separate repo. Until it exists, the app runs on a **mock API** that lives inside the Next server, so every tab, booth device and the display share the same data.

> Status: Phases 1–3 done (setup, foundation, voter flow). Admin panel and `/display` come next. See `docs/PLAN.md`.

## Requirements

- Node.js 24+
- pnpm 12 (`corepack enable` or install pnpm)

## Run it

```bash
pnpm install
cp .env.example .env.local
pnpm dev:mock
```

Open <http://localhost:3000>. To try it on booth devices on the same network, run `pnpm dev:mock --hostname 0.0.0.0` and open the laptop's IP address.

### Demo accounts (mock API only)

| Role              | Email                 | Password        | Behaviour                                  |
| ----------------- | --------------------- | --------------- | ------------------------------------------ |
| Voter (not voted) | `voter@bcc.test`      | `pilketum2026`  | Normal flow for the current election state |
| Second voter      | `voter2@bcc.test`     | `pilketum2026`  | For booth hand-over tests                  |
| Already voted     | `voted@bcc.test`      | `pilketum2026`  | Goes to "You've already voted"             |
| Not a voter       | `guest@bcc.test`      | `pilketum2026`  | "This email isn't on the voter register."  |
| Wrong password    | any voter email       | anything else   | "That email and password don't match…"     |
| Committee         | `committee@bcc.test`  | `committee2026` | Admin panel                                |
| Second committee  | `committee2@bcc.test` | `committee2026` | For two-admin conflict tests               |

These accounts exist only in `src/mocks/fixtures.ts` and are compiled out of production builds (`pnpm build && pnpm check:bundle` proves it).

### Scenario switcher

In mock builds a small **Mock** button sits in the bottom-left corner (hidden on `/display`). It can switch scenario, candidate set (1, 3, 6, long names), voter count (139 or 1,000) and **Reset demo data**.

You can also add a query string to any URL:

| `?scenario=`           | Effect                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `not-started`          | Fresh data, voting not started                                                             |
| `open`                 | Voting open                                                                                |
| `closed`               | Voting closed with ~80% turnout (55 / 30 / 15 split)                                       |
| `already-voted`        | Open, and `voter@bcc.test` has already voted                                               |
| `submit-fails`         | Open; the next vote fails once without being stored                                        |
| `submit-lost-response` | Open; the next vote is stored but the response fails (tests the status check before retry) |
| `closed-mid-vote`      | Open; voting closes when the next vote is submitted                                        |
| `reopen`               | Closed, then reopens by itself after 8 seconds                                             |
| `zero-votes`           | Closed with no votes                                                                       |
| `tie`                  | Closed with the top two candidates tied                                                    |

Optional: `&candidates=one|six|long` and `&voters=1000`. Applying a scenario resets all data and signs everyone out.

## Environment variables

Validated by `src/config/env.ts`.

| Name                      | Default    | Purpose                                                                                |
| ------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_MOCKING` | `disabled` | `enabled` runs the in-repo mock API. Build-time: `pnpm build` always forces `disabled` |
| `NEXT_PUBLIC_BOOTH_MODE`  | `true`     | Shared-device mode: idle timeout and auto sign-out                                     |
| `API_BASE_URL`            | –          | Real backend URL. The browser calls `/api/*`; Next rewrites it here                    |
| `NEXT_OUTPUT`             | –          | `standalone` for self-host builds (`pnpm build:standalone`)                            |

## Scripts

| Command                                            | What                                                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm dev:mock` / `pnpm dev`                       | Dev server with / without the mock API                                                                    |
| `pnpm build`                                       | Production build (mocks compiled out)                                                                     |
| `pnpm build:mock`                                  | Build with the mock API (for e2e, Lighthouse and demos)                                                   |
| `pnpm build:standalone`                            | Self-host build; run with `node .next/standalone/server.js` (copy `.next/static` and `public` next to it) |
| `pnpm start`                                       | Serve the last build                                                                                      |
| `pnpm lint`, `pnpm typecheck`, `pnpm format:check` | Static checks                                                                                             |
| `pnpm test`, `pnpm test:coverage`                  | Unit and contract tests (Vitest)                                                                          |
| `pnpm e2e`                                         | Playwright e2e (desktop, Pixel 7, iPhone 14). Needs `pnpm build:mock` first; uses port 4310               |
| `pnpm check:bundle`                                | After `pnpm build`: fails if demo accounts or mock code are in the output                                 |
| `pnpm lhci`                                        | Lighthouse CI (port 4320)                                                                                 |

First time running e2e: `pnpm exec playwright install chromium webkit`.

## Tests

```bash
pnpm test:coverage
pnpm build:mock
pnpm e2e
```

## Project layout

```
src/app         routes (voter, admin, display, mock API route)
src/features    feature hooks and components (auth, election, candidates, voting, admin, display, booth)
src/components  shared UI primitives, layout, icons
src/lib         api client + schemas, query client, pure utils
src/mocks       mock API (handlers, in-memory db, fixtures, scenarios)
src/config      env schema and constants
src/content     all UI copy
docs/           PLAN, DEVIATIONS, API_CONTRACT, QA_REPORT
tests/          Playwright e2e, visual, a11y
```

Rules for contributors (and Claude Code) are in `CLAUDE.md`.

## Connecting the real backend

1. Compare the backend docs with `docs/API_CONTRACT.md`.
2. Update `src/lib/api/schemas.ts` / `endpoints.ts` (and the mock handlers, so tests keep matching).
3. Set `API_BASE_URL`, build with `pnpm build`, and run the QA checklist again.
