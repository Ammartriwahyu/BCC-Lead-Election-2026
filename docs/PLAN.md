# PLAN — Frontend Pilketum BCC 2026

> Disetujui 9 November 2026. Di akhir tiap fase quality gate dijalankan dan hasilnya dilaporkan.

## Log keputusan

| Tanggal    | Fase | Keputusan                                                                                                                                                                                                                                   | Alasan                                                                                                     |
| ---------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 2026-11-09 | 1    | TypeScript **6.0.3**, bukan 7.0                                                                                                                                                                                                             | `typescript-eslint` 8.72 hanya mendukung `<6.1`                                                            |
| 2026-11-09 | 1    | ESLint **9.39**, bukan 10                                                                                                                                                                                                                   | `eslint-plugin-jsx-a11y` 6.10 belum mendukung ESLint 10                                                    |
| 2026-11-09 | 1    | Tambahan dev-deps: `cross-env` (env lintas OS di script), `tsx` (script token), `eslint-plugin-import` (import order), `prettier-plugin-tailwindcss`, `eslint-config-prettier`, `vite` + `jsdom` + `@testing-library/dom` (peer Vitest/RTL) | Tooling yang diminta bagian 5                                                                              |
| 2026-11-09 | 1    | `output: 'standalone'` hanya lewat `NEXT_OUTPUT=standalone` (`pnpm build:standalone`)                                                                                                                                                       | `next start` (e2e, Lighthouse) memberi warning bila standalone aktif; syarat QA nol warning                |
| 2026-11-09 | 1    | Semua halaman dirender dinamis (`connection()` di root layout)                                                                                                                                                                              | Nonce CSP dari `proxy.ts` hanya sampai ke halaman dinamis                                                  |
| 2026-11-09 | 1    | Port e2e 4310, Lighthouse 4320                                                                                                                                                                                                              | Port 3100 dipakai proses lain di mesin dev                                                                 |
| 2026-11-09 | 1    | Satu flag build `NEXT_PUBLIC_API_MOCKING` (bukan `API_MOCKING` server-only)                                                                                                                                                                 | Harus berupa literal saat build agar kode mock dan akun demo dihapus dari build produksi                   |
| 2026-11-09 | 1    | Skenario tambahan: `submit-lost-response`, `zero-votes`, `tie` + data set kandidat/pemilih                                                                                                                                                  | Menguji cek status sebelum retry, dan data ekstrem di bagian 10                                            |
| 2026-11-09 | 1    | MSW 3: opsi `onUnhandledFrame` (dulu `onUnhandledRequest`)                                                                                                                                                                                  | Perubahan API MSW 3                                                                                        |
| 2026-11-09 | 2    | Token diekspor lengkap lewat Plugin API (baca-saja) ke `design/tokens.json`; `pnpm tokens` menghasilkan `src/styles/tokens.css`                                                                                                             | `get_variable_defs` hanya mengembalikan token yang dipakai satu node                                       |
| 2026-11-09 | 2    | Palet, skala teks, radius, dan shadow bawaan Tailwind di-reset; `--spacing: 1px`                                                                                                                                                            | Hanya token Figma yang bisa dipakai, dan `p-16` = Figma `space/16`                                         |
| 2026-11-09 | 2    | Nama utility: `bg-primary-600`, `text-text-primary`, `text-body-1-semibold`, `rounded-xl`, `shadow-card`                                                                                                                                    | Pemetaan 1:1 dari nama variabel/style Figma                                                                |
| 2026-11-09 | 2    | Gambar yang di-import statis ada di `src/assets`; tile dekorasi SVG di `public/decoration`                                                                                                                                                  | `next/image` mengoptimalkan import statis; tile SVG disajikan apa adanya                                   |
| 2026-11-09 | 2    | `typecheck` menjalankan `next typegen` dulu                                                                                                                                                                                                 | `next-env.d.ts` dan typed routes dibuat oleh Next dan tidak di-commit                                      |
| 2026-11-09 | 2    | Tanpa `clsx`/`tailwind-merge`: helper `cx` sendiri                                                                                                                                                                                          | Tidak menambah dependensi di luar daftar                                                                   |
| 2026-11-09 | 3    | Zod `jitless: true` (`src/lib/api/zodConfig.ts`)                                                                                                                                                                                            | Probe `new Function` milik Zod 4 tercatat sebagai pelanggaran CSP dan menurunkan Best Practices Lighthouse |
| 2026-11-09 | 3    | `ToastProvider` tidak di root; dipasang di area yang memakainya (admin)                                                                                                                                                                     | Radix Toast ~12 KB gzip tidak perlu dimuat di halaman pemilih                                              |
| 2026-11-09 | 3    | Error transient saat submit (network/5xx/timeout) tidak me-refetch `/me`; status baru dicek saat "Try again"                                                                                                                                | Sesuai Design notes "Submit errors": tampilkan V4 dulu, cek status sebelum retry                           |
| 2026-11-09 | 3    | Status pemilih dan pilihan kandidat hanya di memori (`VotingProvider` di layout sesi)                                                                                                                                                       | Aturan bilik: tidak ada web storage; hilang saat sign-out/reload                                           |
| 2026-11-09 | 3    | Lighthouse CI sementara hanya `/sign-in` (mobile + desktop); admin dan display ditambahkan di Fase 4–5                                                                                                                                      | Halaman lain belum ada / butuh login                                                                       |
| 2026-11-09 | 3    | Tes komponen memakai mock `next/navigation` global (`src/test/navigation.ts`) dan helper `renderWithProviders`                                                                                                                              | Menguji alur nyata (MSW node + cookie jar) tanpa server Next                                               |

| 2026-11-16 | 4 | `GET /admin/overview` gets `candidateCount` | A1 shows a "Candidates" card and the committee session cannot call `GET /candidates` |
| 2026-11-16 | 4 | Candidate totals (`/admin/results`) are requested only while the state is `CLOSED` and removed from the query cache when it is not (hook `useAdminResults`); Overview uses them only for the Final results thumbnail | Privacy rule: totals never fetched or shown before voting closes, also after a reopen |
| 2026-11-16 | 4 | Display control reads `display` from the polled `/admin/overview` on both pages; "Show on display" is optimistic with rollback and sends `expectedVersion` | One source for the row state; a second committee member's change shows up within one poll |
| 2026-11-16 | 4 | Confirm buttons guard with a ref, not only `isPending` | E2E found that a double click sent two requests before the first re-render |
| 2026-11-16 | 4 | `SessionExpiryListener` takes `signInRoute`; the committee sign-in form clears the "session ending" flag when it mounts | Reuse for the panel. Without the reset, Back after sign-out restored the shell and stayed on a spinner |
| 2026-11-16 | 4 | Voter search: URL is the state (`?q=&page=`), typing uses `router.replace` after 300 ms, paging uses `router.push` | Reload and Back keep the list position; no history entry per keystroke |
| 2026-11-16 | 4 | Admin e2e and visual specs run on desktop Chrome only (1024 / 1280 / 1512) | Admin is desktop only; requested for this phase |
| 2026-11-16 | 4 | Lighthouse CI also checks `/admin/sign-in`; signed-in admin pages are covered by axe in Playwright | LHCI has no login step |
| 2026-11-16 | 5 | `WINNER_REVEAL` payload gets `candidates: [{ number }]` | D6 labels the hidden cards "Candidate 01…"; numbers only, nothing that hints at the result |
| 2026-11-16 | 5 | Live data in a framework-agnostic controller (`displayFeed.ts`) instead of TanStack Query: stream, polling fallback, backoff, stream retry, "reconnecting" timer | One place for the transport rules, testable with fake timers; TanStack Query has no SSE |
| 2026-11-16 | 5 | `openEventStream` lives in `lib/api/client.ts`, `subscribeDisplay` in `endpoints.ts` | Keeps "only `lib/api` talks to the network"; stream events use the same Zod schema as `GET /display` |
| 2026-11-16 | 5 | Mock SSE route (`/api/display/stream`) streams from the Next server and checks the database every 500 ms | Tests the stream path end to end against the shared mock database |
| 2026-11-16 | 5 | Mock `resetDb` keeps election and display versions increasing | An open `/display` ignores older versions; a reset must behave like a real backend |
| 2026-11-16 | 5 | Display scale via `useSyncExternalStore` (window size); stage hidden until sized | No layout jump; CSS cannot compute a unitless scale from the viewport |
| 2026-11-16 | 5 | Display e2e and visual specs run on desktop Chrome only (1920×1080, 1366×768, 1280×800, 1024×1024) | The display is a laptop + videotron page |
| 2026-11-16 | 5 | Lighthouse CI also checks `/display` | Public page; the open SSE connection does not block the audit (99–100 desktop) |
| 2026-11-17 | 6 | JS budget measured by `scripts/measure-js.mjs` (Brotli, quality 11). "Framework" = scripts of the 404 page; `nomodule` polyfills skipped; signed-in pages measured with placeholder session cookies (the proxy only checks presence). CI gate `pnpm check:js` after `pnpm build` | Makes the 9 Nov decision checkable; the old gzip script counted the polyfill bundle modern browsers never download |
| 2026-11-17 | 6 | Client schemas on `zod/mini` (functional API); `lib/api/errors.ts` no longer imports schemas (`errorResponse.ts` does) | −7 KB Brotli, and Zod leaves the shared baseline (root providers only need `isApiError`) |
| 2026-11-17 | 6 | `content/copy.ts` split: `adminCopy.ts`, `displayCopy.ts` | Voter pages no longer ship admin and display strings (≈ 3 KB) |
| 2026-11-17 | 6 | Own toast list instead of Radix Toast (live region, 6 s, pause on hover) | ≈ 17 KB Brotli on every admin page; no swipe or F8 needed for two messages |
| 2026-11-17 | 6 | Vaul bottom sheet loaded with `next/dynamic` (mobile only) | −8 KB on desktop `/candidates`; on phones it loads while the list renders, before it can be opened |
| 2026-11-17 | 6 | Mutations `gcTime: 0` (`QUERY.mutationGcMs`) | Load test found every previous voter's sign-in page kept alive for 5 min by finished mutations (+375 DOM nodes per voter on a booth) |
| 2026-11-17 | 6 | Images hidden at a breakpoint load `eager`, not `priority` | Preloads for hidden duplicates (mobile/desktop logos, Brace, A0 photo below 1024) were unused and logged browser warnings |
| 2026-11-17 | 6 | Shared Playwright fixture fails a test on any console error/warning or uncaught exception (browser network noise for failures a test causes on purpose is allowed) | Spec §10: no console errors or warnings |
| 2026-11-17 | 6 | Cross-browser projects (Edge, Firefox, desktop WebKit) run the `@cross-browser` tests; CI skips Edge (not on Ubuntu) | Spec §10 browsers; full suite on every browser would triple the run |
| 2026-11-17 | 6 | Lighthouse mobile gates the voter page (`/sign-in`); desktop gates `/sign-in`, `/admin/sign-in`, `/display` | Admin and display are desktop-only (spec §6). `/display` paints after its live payload arrives; mobile 86–90 is reported in QA_REPORT, not gated |
| 2026-11-17 | 6 | Cross-role test: the booth and display run in separate WebKit instances on WebKit, separate contexts elsewhere | WebKit stalls automation of several pages in one instance; three real Edge instances made the run flaky on a laptop |
| 2026-11-17 | 6 | Test server `next start --keepAliveTimeout 70000` | Random `ECONNRESET` when Playwright reused a socket Node was closing after 5 s |
| 2026-11-17 | 7 | Endpoint registry `lib/api/contract.ts` (method, path, auth, schemas, status, error codes); `endpoints.ts` and the mock handlers read it; unit test checks every entry has a mock handler | One place to edit when the backend contract arrives; mock and client cannot drift |
| 2026-11-17 | 7 | `docs/openapi.json` generated from the registry (`pnpm contract:openapi`, `--check` in CI), not hand-written | The backend team gets a diffable spec that always matches the code |
| 2026-11-17 | 7 | Read-only live check `pnpm contract:check <apiBaseUrl>` (`lib/api/contractCheck.ts`), optional test accounts from env | Proves a staging backend against the same schemas before switching; no writes so it is safe on shared staging |
| 2026-11-17 | 7 | ESLint boundary: outside `lib/api` only `endpoints`, `types`, `errors` (and `zodConfig`) may be imported | Wire format and HTTP stay swappable; `onUnauthorized` and `EventStreamHandle` re-exported from endpoints |
| 2026-11-17 | 7 | Session cookie names from runtime env (`SESSION_COOKIE_VOTER` / `_ADMIN`, defaults unchanged); candidate photo hosts from build env `IMAGE_REMOTE_PATTERNS` | Backend names and photo hosts are unknown; no code change needed once they are |
| 2026-11-17 | 7 | A build without `API_BASE_URL` answers `/api/*` with `503` and an explicit message (was `404 NOT_FOUND`) | `API_BASE_URL` is read at build time (rewrites are compiled in); the old 404 looked like a missing endpoint |
| 2026-11-17 | 8 | Backend doc "API Pilketum BCC" adopted: contract, schemas (snake_case) and mappers rewritten; the mock backend implements the doc (Bearer tokens, OTP, candidates CRUD, export) | Integration: only `lib/api`, `lib/bff`, mocks and the new screens changed; components keep the domain types |
| 2026-11-17 | 8 | BFF (`src/lib/bff`): the Next server keeps the backend's Bearer token in httpOnly cookies and forwards `/api/*` (route handler instead of a rewrite); `API_BASE_URL` is read at runtime | Decision by the committee: the spec forbids tokens in browser storage and booth devices are shared. No CORS, CSP stays `connect-src 'self'`, SSE works with cookies. Cost: per-IP limits need `X-Forwarded-For` (BACKEND_QUESTIONS #1) |
| 2026-11-17 | 8 | Committee Candidates (A6–A8), OTP sign-in step, results export, "NIM or UB email" label | Decision by the committee; A6–A8 are new Figma frames (150:3971 …), the rest is NEW UI (DEVIATIONS #71–83) |
| 2026-11-17 | 8 | Vote retry checks `GET /me has_voted` before resending; `VOTING_NOT_OPEN` refetches the status to choose /closed or stay | The API has no idempotency key and one code for not-open / closed |
| 2026-11-17 | 8 | Display feed: no version; a poll answer that started before the latest stream event is dropped | The API sends no version; the stream is always at least as new |
| 2026-11-17 | 8 | JS budget kept: `lib/api/routes.ts` (method + path, no schemas) for the browser, each call imports only its schema; endpoint summaries in `contractDocs.ts`; copy split into `signInCopy.ts` and `candidatesCopy.ts`; the election dialog and the candidate form load lazily | The new endpoints and screens took admin pages to 206 KB and the form to 221 KB; now ≤ 199.8 KB everywhere |
| 2026-11-17 | 8 | Candidate photos use `getImageProps` + plain `<img>` (`components/ui/CandidateImage.tsx`) instead of `<Image>` | With real photos every `<Image>` on the ballot stayed in memory after the voter left (≈ 3 DOM nodes per voter in the booth load test); still resized by the image optimizer |
| 2026-11-17 | 8 | Booth auto sign-out after the vote (V5) and on "already voted" (V5b): 10 s → 3 s (`BOOTH.autoSignOutSeconds`) | Committee request: the booth is free for the next voter sooner. The voter can still press Sign out at once |
| 2026-11-18 | 8 | Backend answers applied: BFF sends `X-BFF-Secret` + `X-Client-IP` (env `BFF_SECRET`, `TRUSTED_PROXY_HOPS`) instead of `X-Forwarded-For`; `API_BASE_URL` may carry a path (staging `/staging`) | Agreed with the backend: the frontend server's IP may change, so a shared secret proves the header; the client IP is taken from the trusted proxy's entry so the browser cannot forge it |
| 2026-11-18 | 8 | `voted_at` (V5b time), `display_name` (topbar), `candidates_locked` (A6–A8 lock), `expected_status` / `expected_screen` with `DISPLAY_CHANGED` → `STATE_CONFLICT`; mock does the same | Fields added by the backend on request; two committee members can no longer overwrite each other's display choice silently |
| 2026-11-18 | 8 | Motion with native CSS (keyframes + `@utility` in `globals.css`, `admin/(panel)/template.tsx`), not GSAP | GSAP is ≈ 25 KB Brotli and admin pages are at 199.7 / 200 KB; CSS runs off the main thread on booth laptops and the global reduced-motion rule already covers it. Entrances use fill-mode `backwards` so no transform stays behind (fixed mobile bars). Visual / a11y checks wait for entrances to finish (`settleAnimations`) |
| 2026-11-18 | 8 | Live committee results while voting is open (`useAdminResults(state, 'live')`, `POLLING.adminLiveResultsMs` 3 s); overview thumbnails, `/display` and export still wait for closing; the mock allows `GET /admin/results` while open | Committee decision: follow the count during the vote. Polling like the overview (no SSE event for totals yet); stops on `RESULTS_LOCKED` so a backend without the change gets a clear message instead of an error every 3 s |
| 2026-11-18 | 8 | Sign-in status strip reads the state on load and on tab focus only (`useElection({ poll: false })`); pages after sign-in keep polling every 5 s | The strip is only a label: signing in works in every state and the ballot pages follow the state themselves. Saves a request every 5 s per open sign-in page; a booth's sign-in page is reloaded by the auto sign-out anyway |
| 2026-11-18 | 8 | Committee panel on `/admin/stream` (`AdminStreamProvider`, `adminStream.ts`): one SSE connection for every admin page; events replace the overview and refresh voters / live results only on a new vote. Polling stays as the fallback (stream that never opens: poll for good; one that drops: poll and retry after 60 s) | Same pattern as `/display`: changes show in under a second and the panel sends no request while nothing happens, instead of 2–3 polls every 4 s per open admin tab |
| 2026-11-18 | 8 | Display control card loads lazily on Overview and Results (`LazyDisplayControlCard`, skeleton 600 px) | The stream code took `/admin` and `/admin/results` to 200.3–200.4 KB; the card sits below the fold. Now ≤ 199.9 KB on every admin page (voters and candidates are the tightest) |
| 2026-11-18 | 8 | Voter pages on `/election/stream` (`useElectionStream` in the session gate, `ElectionPollingContext`): no polling while the stream is open, polling every 5 s while it is down, neither once the voter has voted | Backend added the stream (BACKEND_QUESTIONS #15); voters who already voted made polls that changed nothing |
| 2026-11-18 | 8 | Stream with polling fallback shared in `lib/stream/fallbackStream.ts` (committee panel and voter pages); the voter side loads it with `import()` after the page | One implementation; the voter pages were at 199.8–199.9 KB first-load JS |
| 2026-11-20 | 8 | Mission points up to 200 characters (backend limit) instead of 160 (spec 4.4) | The committee set no limit for vision and mission; more than 5 points or a longer vision would need the backend first |
| 2026-11-17 | 8 | Open voting needs exactly 3 complete candidates (backend), not "at least 2" (spec 4.4); form limits use the stricter spec values (name 80, mission 160) | Backend is authoritative for opening; asked in BACKEND_QUESTIONS #5–6 |
| 2026-11-17 | 6 | Load and endurance specs in `tests/load` (3 booths × 139 voters; one booth × 20 voters memory; display 4 h on a fake clock) | Spec §10 "Beban & ketahanan"; Chromium DevTools metrics |

## Context

BCC butuh sistem e-voting untuk Pemilihan Ketua Umum 2026 (±139 pemilih, 3 bilik suara dengan perangkat bersama, voting dan pengumuman di hari yang sama, state dikendalikan manual oleh panitia). Repo `BCC-Lead-Election-2026` masih kosong (belum ada commit). Backend dibuat di repo terpisah dan belum ada, jadi frontend dibangun di atas **mock API** yang bisa diganti ke backend asli cukup dengan mengubah `lib/api` dan `mocks`.

Sumber kebenaran visual: Figma `8cCLCY4AJ7Xm3st7Dzy8iz`, section **Pilketum – v2** (`8:3924`). Discovery sudah membaca: Design notes (`44:3290`), daftar seluruh frame v2, token (`get_variable_defs`), dan screenshot V2, MV2, V0d, A2, A4, Display control, D1, D3.

## Keputusan yang sudah disetujui

| Topik      | Keputusan                                                                                                                                                                                                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mock API   | **Server-side.** Handler MSW yang sama dieksekusi di server Next lewat catch-all route `app/api/[...path]/route.ts` (pakai `getResponse` dari MSW). State mock in-memory di `globalThis`, jadi dibagi ke semua tab, perangkat bilik, admin, dan `/display`. Cookie sesi asli `httpOnly`. Handler yang sama dipakai di Vitest via `msw/node`. |
| Origin API | **Proxy `/api`.** Browser selalu memanggil `/api/*` (same-origin). Saat backend asli ada, `next.config` `rewrites` meneruskan ke `API_BASE_URL`; route mock hanya aktif bila `API_MOCKING=enabled`.                                                                                                                                          |
| Hosting    | **Node self-host** (`output: 'standalone'`, `next start`). Tetap bisa di Vercel untuk build tanpa mock.                                                                                                                                                                                                                                      |

## Temuan discovery yang memengaruhi build

- **Versi terbaru (dicek via registry, dicek ulang di Context7 di Fase 1):** Next 16.4, React 19.3, TS 7.0, Tailwind 4.3, TanStack Query 5.107, MSW 3.0, Zod 4.6, RHF 7.91, Vaul 1.1, radix-ui 1.8, Vitest 5.1, Playwright 1.65, ESLint 10. Node 24 dan pnpm 12 sudah terpasang.
- **Next 16:** `middleware.ts` sudah diganti `proxy.ts`. Route guard ditulis di `src/proxy.ts`.
- **TypeScript 7 (native):** kalau typescript-eslint atau Next belum kompatibel, pakai TS 6.x/5.x terbaru yang didukung dan catat di PLAN.
- **Token:** `get_variable_defs` hanya mengembalikan token yang dipakai node tertentu. Ekspor lengkap dilakukan dengan menggabungkan hasil dari semua frame v2 + komponen design system (Button `1:2692`) menjadi `design/tokens.json`, lalu script `scripts/build-tokens.ts` menghasilkan `src/styles/tokens.css` (`@theme`). Tidak ada hex yang disalin manual. Token yang sudah terlihat: `color/primary/200–800`, `color/slate/200–700`, `color/orange/300–500`, `color/red/600`, `color/neutral/50–100`, `semantic/{bg,text,action,border,surface,status}/*`, `space/0–100`, `radius/md 10, lg 12, xl 20, full`, text style `BCC/Heading 1–6`, `Body 1/2 (+Medium/Semi Bold)`, `Caption`, effect `BCC/Shadow card` (+modal, dropdown).
- **Copy Figma vs data:** Figma memakai 300 pemilih dan 132/72/36 suara sebagai placeholder. Semua angka, nama kandidat, foto, jurusan, visi, misi berasal dari data.
- **Sign in error (V0d)** menampilkan banner dan error field sekaligus. Pemetaan: `INVALID_CREDENTIALS` → banner "That email and password don't match…", `NOT_A_VOTER` → error di field email "This email isn't on the voter register."
- **Mobile hanya untuk pemilih** (lebar 390, navbar tetap, action bar bawah, konfirmasi berupa bottom sheet). Admin dan display khusus desktop.
- **Display control** punya 6 baris; di state OPEN/NOT_STARTED hanya layar otomatis yang aktif, dan baris lain dinonaktifkan dengan alasan ("Only before voting opens", "Available after voting closes", dll).

## Route map

| Route                                                         | Frame                                                    | Catatan                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/sign-in`                                                    | V0a–d / MV0a–d                                           | Status strip mengikuti state. `?next=` divalidasi terhadap state.                                |
| `/candidates`                                                 | V1, V2, Selected, O Confirm, O Submitting / MV1, MV2, MO | Mode Locked (NOT_STARTED) ↔ memilih (OPEN) tanpa reload. Dialog (desktop) / Vaul sheet (mobile). |
| `/candidates/[id]`                                            | V1 V&M, V3 / MV1 V&M, MV3                                | 404 BCC bila id tidak valid.                                                                     |
| `/vote/submitted`, `/vote/error`, `/already-voted`, `/closed` | V5, V4, V5b, V6 / MV5, MV4, MV5b, MV6                    | Auto sign-out 3 dtk di submitted & already-voted (mode bilik).                                   |
| `/admin/sign-in`                                              | A0                                                       | Foto login panitia dari Figma.                                                                   |
| `/admin`                                                      | A1, A2, A3 + O Open/Close/Reopen                         | Turnout live (poll ≤5 dtk).                                                                      |
| `/admin/voters?q=&page=`                                      | A5 × 3 state (+ last page, no results)                   | Debounce 300 ms, paginasi server.                                                                |
| `/admin/results`                                              | A4 + O Results locked                                    | Terkunci kecuali CLOSED. Reopen dari sini → kembali ke `/admin`.                                 |
| `/display`                                                    | D1, D2, D5, D6, D3, D4                                   | 1920×1080 scale-to-fit, tanpa login.                                                             |
| `not-found`, `error`, `global-error`                          | — (gaya BCC, dicatat di DEVIATIONS)                      |                                                                                                  |

## Struktur kode (sesuai bagian 6 prompt, dengan penyesuaian)

```
src/
  app/(voter)/…, app/admin/(auth)/sign-in, app/admin/(panel)/…, app/display, app/api/[...path]/route.ts (mock dispatcher)
  features/{auth,election,candidates,voting,admin,display,booth}
  components/{ui,layout,icons}
  lib/api/{client,errors,endpoints,types,schemas}.ts   ← satu-satunya lapisan HTTP; DTO→domain + validasi Zod
  lib/query/{queryClient,keys}.ts, lib/utils/format.ts
  mocks/{db,handlers,fixtures,scenarios,server}.ts      ← db.ts = state in-memory + reset
  styles/{tokens.css,globals.css}, config/{env,constants}.ts, content/copy.ts
  proxy.ts                                               ← guard sesi voter/admin (Next 16)
design/tokens.json, scripts/build-tokens.ts
docs/{PLAN,DEVIATIONS,API_CONTRACT,QA_REPORT}.md, CLAUDE.md, README.md
tests/{e2e,visual,a11y,load}/
```

Alur wajib: UI → hook `features/*` → `lib/api` → `/api/*` (mock dispatcher | rewrite ke backend). Komponen tidak pernah memanggil `fetch`.

## Kontrak API asumsi (semua berlabel `ASSUMED` di `docs/API_CONTRACT.md`)

`POST /auth/voter/sign-in`, `POST /auth/sign-out`, `GET /me`, `GET /election` (state + version), `GET /candidates`, `GET /candidates/:id`, `POST /votes` (header `Idempotency-Key`, body `{candidateId, expectedState}`), `POST /admin/auth/sign-in`, `GET /admin/overview`, `POST /admin/election/{open|close|reopen}` (body `{expectedState}` → 409 `STATE_CONFLICT`), `GET /admin/voters?q&page`, `GET /admin/results` (403 kecuali CLOSED), `PUT /admin/display {screen}`, `GET /display` (payload layar aktif saja) + `GET /display/stream` (SSE, opsional).
Kode error: `INVALID_CREDENTIALS, NOT_A_VOTER, ALREADY_VOTED, VOTING_NOT_OPEN, VOTING_CLOSED, STATE_CONFLICT, UNAUTHORIZED, NETWORK, TIMEOUT, UNKNOWN`, masing-masing dengan copy dan aksi UI di `content/copy.ts` + `lib/api/errors.ts`.

## Mock & mode demo

- Akun demo (`voter@`, `voter2@`, `voted@`, `guest@`, `committee@`, `committee2@` `bcc.test`) hanya di `mocks/fixtures.ts`.
- Scenario switcher: `?scenario=not-started|open|closed|already-voted|submit-fails|closed-mid-vote|reopen` + panel kecil, hanya dirender saat `API_MOCKING=enabled` dan di-load lewat dynamic import. Tombol **Reset demo data**.
- Idempotency di mock: map `Idempotency-Key → response` agar retry tidak membuat suara ganda.
- Fixture tambahan untuk QA: 1 kandidat, 6 kandidat, nama sangat panjang, 0 suara, seri, 139 dan 1.000 pemilih.
- Penjaga produksi: route mock mengembalikan 503 (pesan "build tanpa API_BASE_URL") bila `API_MOCKING` tidak aktif, dan CI memeriksa bahwa `.next/static` tidak mengandung `bcc.test` atau kode scenario switcher.

## Keputusan desain yang akan dicatat di DEVIATIONS

Auto sign-out countdown (V5/V5b), dialog idle "Still there?", banner offline, 404/error page, skeleton loading, varian seri (Results, D3 Final results, D4 Most votes, D6), layout Final results/podium untuk 1 kandidat dan >3 kandidat (≤3 podium; >3 daftar bar berperingkat dengan gaya yang sama), sidebar admin menjadi drawer <1024px, indikator koneksi display >30 dtk, pesan "session expired" di sign-in.

## Fase

0. **Discovery** — selesai (dokumen ini).
1. **Setup** — scaffold Next 16 + TS strict + pnpm, Tailwind v4, ESLint/Prettier/Husky/lint-staged, Vitest, Playwright + axe, Lighthouse CI, GitHub Actions, `CLAUDE.md`, `config/env.ts` (Zod), mock dispatcher + db + scenario switcher, security headers di `next.config`.
2. **Foundation** — ekspor token dan aset (logo, Brace Hello/Woah/Glory, dekorasi, foto admin, ikon SVG) dari Figma; primitive `components/ui` (Button, Badge, StatCard, Dialog, BottomSheet, Field, PasswordField, SearchBar, Spinner, Toast); layout (VoterNavbar desktop/mobile, VoterFooter, MobileActionBar, AdminSidebar, AdminTopbar, Decoration, Brace); 404/error.
3. **Voter flow** desktop + mobile, termasuk semua edge case 4.2 dan mode bilik 4.3.
4. **Admin** — Overview × 3, dialog state + konflik, Voter list, Results, Display control (optimistic + rollback).
5. **Display** — 6 layar, scale-to-fit, adapter SSE→polling 3 dtk, backoff, wake lock, F fullscreen, kursor tersembunyi, fade 400 ms.
6. **Hardening & QA** — seluruh bagian 10, `docs/QA_REPORT.md`. **Selesai 17 Nov 2026**; sisa uji manual tercantum di QA_REPORT §10.
7. **Integration readiness** — rapikan `lib/api` + `API_CONTRACT.md`, daftar pertanyaan untuk tim backend. **Selesai 17 Nov 2026**: registry `lib/api/contract.ts`, `docs/openapi.json`, `pnpm contract:check`, `docs/INTEGRATION.md`, `docs/BACKEND_QUESTIONS.md`. Sisa: jawaban tim backend, lalu langkah di INTEGRATION.md.
8. **Integrasi API backend** — dokumentasi "API Pilketum BCC" diterapkan lewat BFF; halaman Candidates (A6–A8), langkah OTP, export hasil. **Selesai 17 Nov 2026**; jawaban tim backend diterapkan 18 Nov 2026. Sisa: `pnpm contract:check` ke staging dengan akun uji, uji manual QA_REPORT §10 di staging, isi `BFF_SECRET` production di server.

## Risiko

- Kompatibilitas tooling dengan TS 7 / ESLint 10 / Next 16 (mitigasi: cek Context7, turunkan versi bila perlu, catat alasannya).
- MSW 3 `getResponse` di route handler: diverifikasi di awal Fase 1. Fallback: dispatcher kecil sendiri yang memakai handler yang sama.
- **Anggaran JS awal ≤150 KB gzip tidak tercapai (Fase 3, build produksi):** `/sign-in` 263 KB gzip (230 KB brotli), halaman 404 kosong 232 KB gzip. Framework Next 16 + React 19 sendiri ±153 KB gzip; Zod + TanStack Query ±36 KB. Lighthouse tetap 100/100/100 (desktop) dan lolos mobile. Perlu keputusan: ukur anggaran untuk kode aplikasi saja (di luar framework), atau ganti ke `zod/mini` (±25 KB lebih kecil). **Keputusan (9 Nov 2026): dikerjakan di Fase 6** — anggaran baru: kode aplikasi ≤ 80 KB Brotli per halaman pemilih, total ≤ 200 KB Brotli, cek otomatis di CI, plus `zod/mini` di klien. **Selesai (17 Nov 2026):** semua halaman lolos (app 35–59 KB, total 175–199.5 KB Brotli; lihat QA_REPORT). Halaman admin hanya 0,5 KB di bawah batas.
- Uji VoiceOver/Safari/iOS dan uji ketahanan display 4 jam tidak bisa saya jalankan penuh dari Windows; akan saya otomasi semampunya (Playwright WebKit, run panjang dipercepat) dan tandai sisanya di QA_REPORT sebagai uji manual.
- Ekspor token lengkap bergantung pada akses Figma MCP; jika ada token yang tidak terjangkau, saya laporkan sebelum menebak.

## Verifikasi (per fase dan akhir)

- `pnpm lint`, `pnpm typecheck`, `pnpm test --coverage` (≥80% `features/` + `lib/`), `pnpm build`, `pnpm e2e` (Playwright + axe, desktop + Pixel 7 + iPhone 14), `pnpm lhci`.
- Screenshot Playwright di 360/390/768/1024/1280/1512/1920 dibandingkan dengan `get_screenshot` Figma per frame.
- E2E lintas peran memakai beberapa browser context terhadap mock server-side yang sama (admin buka/tutup/reopen → pemilih & display berubah sendiri; konflik dua admin; 3 bilik × 139 pemilih paralel).
- Cek bundle produksi bebas akun demo dan scenario switcher.
