#!/usr/bin/env node
/**
 * Sums the gzip size of every script a page loads on first visit (spec §6: voter pages ≤ 150 KB gzip).
 * Usage: pnpm start (or build:mock + start) then `node scripts/measure-js.mjs http://localhost:3000/sign-in [...]`
 */
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 150;
const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error('Usage: node scripts/measure-js.mjs <url> [url...]');
  process.exit(1);
}

let failed = false;
for (const url of urls) {
  const html = await (await fetch(url, { redirect: 'manual' })).text();
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => new URL(m[1], url).href);
  let total = 0;
  for (const src of new Set(srcs)) {
    const body = Buffer.from(await (await fetch(src)).arrayBuffer());
    total += gzipSync(body, { level: 9 }).length;
  }
  const kb = total / 1024;
  const ok = kb <= BUDGET_KB;
  failed ||= !ok;
  console.log(
    `${ok ? 'OK  ' : 'OVER'} ${url}: ${kb.toFixed(1)} KB gzip across ${srcs.length} scripts (budget ${BUDGET_KB} KB)`,
  );
}
process.exit(failed ? 1 : 0);
