#!/usr/bin/env node
/**
 * First-load JavaScript budget (PLAN, decision 2026-11-09):
 *   - app code   ≤ 80 KB Brotli per page
 *   - total      ≤ 200 KB Brotli per page
 * "Framework" = the scripts every page loads, measured on the 404 page (Next runtime, React,
 * root layout providers). "App code" = the scripts a page loads on top of that.
 * `nomodule` scripts (legacy polyfills) are skipped: supported browsers never download them.
 *
 * Usage (against a running production build, e.g. `pnpm build && pnpm start --port 4330`):
 *   node scripts/measure-js.mjs http://localhost:4330 /sign-in /admin/sign-in /display
 * (In Git Bash prefix MSYS_NO_PATHCONV=1, or the paths are rewritten to Windows paths.)
 * Exits 1 when a page is over budget.
 */
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const BUDGET = { appKb: 80, totalKb: 200 };
const BASELINE_PATH = '/__budget-baseline-404';
const SCRIPT_TAG = /<script\b[^>]*>/g;
const NOMODULE = /\bnomodule\b/i;
const COOKIES = 'pilketum_voter_session=budget; pilketum_admin_session=budget';
const SRC = /\bsrc="([^"]+)"/;

const [origin, ...paths] = process.argv.slice(2);
if (!origin || paths.length === 0) {
  console.error('Usage: node scripts/measure-js.mjs <origin> <path> [path...]');
  process.exit(1);
}

const cache = new Map();

async function scriptSizes(src) {
  if (!cache.has(src)) {
    const body = Buffer.from(await (await fetch(src)).arrayBuffer());
    cache.set(src, {
      br: brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
      gz: gzipSync(body, { level: 9 }).length,
    });
  }
  return cache.get(src);
}

async function scriptsOf(path) {
  const url = new URL(path, origin).href;
  // The proxy only checks that a session cookie exists, so placeholder cookies return the real
  // HTML (and script list) of signed-in pages; their data loads later and is not measured.
  const html = await (
    await fetch(url, { redirect: 'manual', headers: { Cookie: COOKIES } })
  ).text();
  const srcs = [...html.matchAll(SCRIPT_TAG)]
    .map((match) => match[0])
    .filter((tag) => !NOMODULE.test(tag))
    .map((tag) => SRC.exec(tag)?.[1])
    .filter(Boolean);
  return new Set(srcs.map((src) => new URL(src, url).href));
}

const kb = (bytes) => (bytes / 1024).toFixed(1);

const baseline = await scriptsOf(BASELINE_PATH);
let frameworkBr = 0;
for (const src of baseline) frameworkBr += (await scriptSizes(src)).br;
console.log(`framework (404 page): ${kb(frameworkBr)} KB br across ${baseline.size} scripts`);

let failed = false;
for (const path of paths) {
  const scripts = await scriptsOf(path);
  let totalBr = 0;
  let totalGz = 0;
  let appBr = 0;
  for (const src of scripts) {
    const size = await scriptSizes(src);
    totalBr += size.br;
    totalGz += size.gz;
    if (!baseline.has(src)) appBr += size.br;
  }
  const ok = appBr / 1024 <= BUDGET.appKb && totalBr / 1024 <= BUDGET.totalKb;
  failed ||= !ok;
  console.log(
    `${ok ? 'OK  ' : 'OVER'} ${path}: app ${kb(appBr)} KB br (≤ ${BUDGET.appKb}), total ${kb(totalBr)} KB br (≤ ${BUDGET.totalKb}), ${kb(totalGz)} KB gzip, ${scripts.size} scripts`,
  );
}
process.exit(failed ? 1 : 0);
