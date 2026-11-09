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
| `/vote/submitted`, `/vote/error`, `/already-voted`, `/closed` | V5, V4, V5b, V6 / MV5, MV4, MV5b, MV6                    | Auto sign-out 10 dtk di submitted & already-voted (mode bilik).                                  |
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
- Penjaga produksi: route mock mengembalikan 404 bila `API_MOCKING` tidak aktif, dan CI memeriksa bahwa `.next/static` tidak mengandung `bcc.test` atau kode scenario switcher.

## Keputusan desain yang akan dicatat di DEVIATIONS

Auto sign-out countdown (V5/V5b), dialog idle "Still there?", banner offline, 404/error page, skeleton loading, varian seri (Results, D3 Final results, D4 Most votes, D6), layout Final results/podium untuk 1 kandidat dan >3 kandidat (≤3 podium; >3 daftar bar berperingkat dengan gaya yang sama), sidebar admin menjadi drawer <1024px, indikator koneksi display >30 dtk, pesan "session expired" di sign-in.

## Fase

0. **Discovery** — selesai (dokumen ini).
1. **Setup** — scaffold Next 16 + TS strict + pnpm, Tailwind v4, ESLint/Prettier/Husky/lint-staged, Vitest, Playwright + axe, Lighthouse CI, GitHub Actions, `CLAUDE.md`, `config/env.ts` (Zod), mock dispatcher + db + scenario switcher, security headers di `next.config`.
2. **Foundation** — ekspor token dan aset (logo, Brace Hello/Woah/Glory, dekorasi, foto admin, ikon SVG) dari Figma; primitive `components/ui` (Button, Badge, StatCard, Dialog, BottomSheet, Field, PasswordField, SearchBar, Spinner, Toast); layout (VoterNavbar desktop/mobile, VoterFooter, MobileActionBar, AdminSidebar, AdminTopbar, Decoration, Brace); 404/error.
3. **Voter flow** desktop + mobile, termasuk semua edge case 4.2 dan mode bilik 4.3.
4. **Admin** — Overview × 3, dialog state + konflik, Voter list, Results, Display control (optimistic + rollback).
5. **Display** — 6 layar, scale-to-fit, adapter SSE→polling 3 dtk, backoff, wake lock, F fullscreen, kursor tersembunyi, fade 400 ms.
6. **Hardening & QA** — seluruh bagian 10, `docs/QA_REPORT.md`.
7. **Integration readiness** — rapikan `lib/api` + `API_CONTRACT.md`, daftar pertanyaan untuk tim backend.

## Risiko

- Kompatibilitas tooling dengan TS 7 / ESLint 10 / Next 16 (mitigasi: cek Context7, turunkan versi bila perlu, catat alasannya).
- MSW 3 `getResponse` di route handler: diverifikasi di awal Fase 1. Fallback: dispatcher kecil sendiri yang memakai handler yang sama.
- **Anggaran JS awal ≤150 KB gzip tidak tercapai (Fase 3, build produksi):** `/sign-in` 263 KB gzip (230 KB brotli), halaman 404 kosong 232 KB gzip. Framework Next 16 + React 19 sendiri ±153 KB gzip; Zod + TanStack Query ±36 KB. Lighthouse tetap 100/100/100 (desktop) dan lolos mobile. Perlu keputusan: ukur anggaran untuk kode aplikasi saja (di luar framework), atau ganti ke `zod/mini` (±25 KB lebih kecil). **Keputusan (9 Nov 2026): dikerjakan di Fase 6** — anggaran baru: kode aplikasi ≤ 80 KB Brotli per halaman pemilih, total ≤ 200 KB Brotli, cek otomatis di CI, plus `zod/mini` di klien.
- Uji VoiceOver/Safari/iOS dan uji ketahanan display 4 jam tidak bisa saya jalankan penuh dari Windows; akan saya otomasi semampunya (Playwright WebKit, run panjang dipercepat) dan tandai sisanya di QA_REPORT sebagai uji manual.
- Ekspor token lengkap bergantung pada akses Figma MCP; jika ada token yang tidak terjangkau, saya laporkan sebelum menebak.

## Verifikasi (per fase dan akhir)

- `pnpm lint`, `pnpm typecheck`, `pnpm test --coverage` (≥80% `features/` + `lib/`), `pnpm build`, `pnpm e2e` (Playwright + axe, desktop + Pixel 7 + iPhone 14), `pnpm lhci`.
- Screenshot Playwright di 360/390/768/1024/1280/1512/1920 dibandingkan dengan `get_screenshot` Figma per frame.
- E2E lintas peran memakai beberapa browser context terhadap mock server-side yang sama (admin buka/tutup/reopen → pemilih & display berubah sendiri; konflik dua admin; 3 bilik × 139 pemilih paralel).
- Cek bundle produksi bebas akun demo dan scenario switcher.
