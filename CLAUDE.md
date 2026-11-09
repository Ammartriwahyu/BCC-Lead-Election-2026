# CLAUDE.md — Pilketum BCC 2026 (frontend)

E-voting frontend for the BCC Chairperson Election 2026: voter web (booth + mobile), admin panel, public `/display`. Backend lives in a separate repo and does not exist yet; this repo runs on a **server-side mock API**.

Full plan: `docs/PLAN.md`. Design deviations: `docs/DEVIATIONS.md`. API contract: `docs/API_CONTRACT.md`.

## Source of truth

- Figma file `8cCLCY4AJ7Xm3st7Dzy8iz`, section **Pilketum – v2** (`8:3924`) only. Design notes frame `44:3290`. Design system page `0:1`.
- Figma decides look, copy, colours, spacing and states. Do not invent UI or copy. Anything not in Figma (skeleton, 404, booth countdown…) must match the BCC style and be logged in `docs/DEVIATIONS.md`.
- UI language: **English**. Docs/comments: Indonesian or English, consistent per file.

## Stack

Next.js 16 (App Router, Turbopack, `src/proxy.ts` instead of middleware) · React 19 · TypeScript 6 strict · Tailwind CSS v4 (tokens via `@theme`) · Radix UI (`radix-ui`) + Vaul · TanStack Query 5 · React Hook Form + Zod 4 · MSW 3 (run server-side) · Vitest 5 + RTL · Playwright + axe · Lighthouse CI · pnpm 12, Node 24.

Version notes: TS 7 and ESLint 10 are not supported yet by typescript-eslint / jsx-a11y, so TS 6.0 and ESLint 9 are used. Do not add dependencies without a reason in `docs/PLAN.md`.

## Commands

| Command                                              | What                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `pnpm dev:mock`                                      | Dev server with mock API (demo accounts in README)           |
| `pnpm dev`                                           | Dev server against `API_BASE_URL`                            |
| `pnpm build`                                         | Production build, mocks compiled out                         |
| `pnpm build:mock`                                    | Build with mock API (e2e, Lighthouse, demos)                 |
| `pnpm build:standalone`                              | Self-host build (`.next/standalone`)                         |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | Static checks (0 warnings allowed)                           |
| `pnpm test` / `pnpm test:coverage`                   | Vitest (coverage ≥ 80% on `src/features`, `src/lib`)         |
| `pnpm e2e`                                           | Playwright on a running `pnpm build:mock` output (port 4310) |
| `pnpm check:bundle`                                  | After `pnpm build`: fails if mock code leaked into the build |
| `pnpm lhci`                                          | Lighthouse CI (port 4320)                                    |
| `pnpm tokens`                                        | Regenerate `src/styles/tokens.css` from `design/tokens.json` |

## Architecture rules

- **Layers:** UI component → hook in `src/features/*` → `src/lib/api/endpoints.ts` → `src/lib/api/client.ts` → same-origin `/api/*`.
  - Components never call `fetch` (ESLint enforces). Only `lib/api/client.ts` does HTTP.
  - DTO → domain mapping happens once in `lib/api/endpoints.ts`; every response is Zod-validated (`lib/api/schemas.ts`).
- **`/api/*`:** in mock builds `src/app/api/[...path]/route.ts` runs the MSW handlers (`src/mocks/handlers.ts`) in the Next server, so all tabs/devices share one in-memory DB. In real builds `next.config.ts` rewrites `/api/*` to `API_BASE_URL`.
- **Mock-only code** (`src/mocks/**`) must only be reached behind a literal `process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'` check, so it is dead-code-eliminated from production. `pnpm check:bundle` verifies.
- **Auth:** httpOnly cookies `pilketum_voter_session` / `pilketum_admin_session` (ASSUMED names). `src/proxy.ts` only checks cookie presence; layouts check role/state via the API. Never store tokens or voter data in localStorage/sessionStorage.
- **Server vs client:** server components by default; `"use client"` only for interactive parts, never on the root layout.
- **Privacy:** no response or UI links a voter to a candidate; candidate totals never shown or fetched while state is not `CLOSED`. `/display` only uses the payload of the screen on air.
- **State:** election state comes only from the backend (`NOT_STARTED` → `OPEN` → `CLOSED`, `CLOSED` → `OPEN` via reopen). Nothing is time-based.

## Conventions

- Folders: `app/` routes only · `features/<area>/{components,hooks,…}` · `components/{ui,layout,icons}` shared · `lib/` framework-agnostic · `config/` env + constants · `content/copy.ts` all UI strings.
- PascalCase components, one component per file, explicit prop types, hooks `useX`, no `any`, small pure functions.
- No magic numbers: put them in `src/config/constants.ts`. No UI strings in components: use `content/copy.ts` (mock-only UI is exempt).
- Colours, spacing, radius, type and shadows only via tokens (`src/styles/tokens.css`, generated by `pnpm tokens` from `design/tokens.json`). No hand-copied hex. Tailwind's default palette/type/radius/shadow are reset, so a non-token class simply does nothing (prettier-plugin-tailwindcss sorts unknown classes first — a hint).
  - Spacing unit is 1px: `p-16` = Figma `space/16`, `w-760` = 760px.
  - Colours: `bg-primary-600`, `text-slate-500`, semantic `bg-bg-navy`, `text-text-secondary`, `border-border-card`, `bg-action-primary`, `bg-status-success-bg`.
  - Type: `text-heading-1…6`, `text-body-1`, `text-body-1-medium`, `text-body-1-semibold`, `text-body-2(-medium|-semibold)`, `text-caption(-semibold)`, `text-display(-l|-xl)` (size, line height, tracking and weight in one class).
  - Radius `rounded-sm|md|lg|xl|full`, shadows `shadow-card|modal|dropdown`, page padding `page-gutter`.
- Shared UI lives in `components/ui` (Button, ButtonLink, Badge, StatCard, TextField, PasswordField, SearchField, Alert, Dialog, BottomSheet, Spinner, Skeleton, Toaster, Announcer) and `components/layout` (VoterNavbar, VoterFooter, VoterPageShell, StatusScreen, MobileActionBar, AdminSidebar, AdminTopbar, Logo, Brace, Decoration). Check `/dev/gallery` in a mock build.
- Mark navy areas with `data-surface="dark"` so focus rings turn white.
- Numbers/percent: `en-US`, 1 decimal (`55.0%`) via `lib/utils/format.ts`. Times in WIB (Asia/Jakarta).
- Breakpoints: `sm 390`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1512`. < 768 mobile layout; admin ≥ 1024; display 1920×1080 scaled.
- Touch targets ≥ 44×44, visible 2px focus ring, `prefers-reduced-motion` respected, decorations `aria-hidden`.

## Tests

- Unit/component tests sit next to the code (`*.test.ts(x)`). Use `renderWithProviders` (`src/test/render.tsx`) and the global `next/navigation` mock (`src/test/navigation.ts`: set `navigation.pathname`, assert on `navigation.router.replace`).
- API calls in tests hit the real mock handlers through msw/node; `src/test/cookieJar.ts` keeps session cookies. Set up data with `applyScenario()` and `voterSignIn()`.
- E2E specs share one server and one mock database: start every test with `applyScenario(request, …)`. Committee actions before the admin UI: `committee(request, 'open'|'close'|'reopen')`.
- `tests/visual/` captures every screen at 360–1512 px with axe and no-horizontal-scroll checks.
- First-load JS: `node scripts/measure-js.mjs <url>` against `pnpm start`.

## Definition of done (per change)

1. Matches the Figma frame (compare with `get_screenshot`) at 390 / 768 / 1024 / 1512 (1920 for display).
2. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + `pnpm check:bundle` pass with zero warnings.
3. Relevant Playwright spec added/updated and passing, no serious/critical axe violations.
4. New UI not in Figma logged in `docs/DEVIATIONS.md`; contract changes in `docs/API_CONTRACT.md`.
