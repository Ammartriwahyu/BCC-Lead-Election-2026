#!/usr/bin/env node
/**
 * Guards a production build (NEXT_PUBLIC_API_MOCKING=disabled):
 * no demo accounts, mock handlers or scenario switcher may end up in client or server output.
 * Usage: pnpm build && pnpm check:bundle
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['.next/static', '.next/server'];
const FORBIDDEN = [
  'bcc.test',
  'pilketum2026',
  'committee2026',
  '__pilketumMockDb__',
  'Scenario switcher',
];
const TEXT_EXT = /\.(js|mjs|cjs|json|html|txt|rsc|map)$/;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (TEXT_EXT.test(name)) yield full;
  }
}

const hits = [];
let scanned = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    scanned += 1;
    const text = readFileSync(file, 'utf8');
    for (const needle of FORBIDDEN) {
      if (text.includes(needle)) hits.push(`${file}: ${needle}`);
    }
  }
}

if (scanned === 0) {
  console.error('check-bundle: no build output found. Run `pnpm build` first.');
  process.exit(1);
}
if (hits.length > 0) {
  console.error(`check-bundle: mock-only code found in the production build:\n${hits.join('\n')}`);
  process.exit(1);
}
console.log(`check-bundle: OK (${scanned} files scanned, no mock-only code).`);
