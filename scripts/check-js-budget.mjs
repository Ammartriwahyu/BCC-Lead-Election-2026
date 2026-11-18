#!/usr/bin/env node
/**
 * CI gate for the first-load JS budget: starts the production build (`pnpm build` first),
 * measures every route with scripts/measure-js.mjs and exits with its result.
 * Usage: pnpm build && pnpm check:js
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.BUDGET_PORT ?? 4350);
const ORIGIN = `http://localhost:${PORT}`;
const READY_TIMEOUT_MS = 60_000;
const POLL_MS = 500;
const ROUTES = [
  '/sign-in',
  '/candidates',
  '/candidates/1',
  '/vote/submitted',
  '/vote/error',
  '/already-voted',
  '/closed',
  '/admin/sign-in',
  '/admin',
  '/admin/voters',
  '/admin/results',
  '/admin/candidates',
  '/admin/candidates/new',
  '/admin/candidates/1/edit',
  '/display',
];

const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--port', String(PORT)],
  {
    stdio: 'ignore',
    env: { ...process.env, NODE_ENV: 'production' },
  },
);

async function waitForServer() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${ORIGIN}/sign-in`);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await sleep(POLL_MS);
  }
  throw new Error(`next start did not answer on ${ORIGIN} within ${READY_TIMEOUT_MS / 1000}s`);
}

let code = 1;
try {
  await waitForServer();
  code = await new Promise((resolve) => {
    const measure = spawn(process.execPath, ['scripts/measure-js.mjs', ORIGIN, ...ROUTES], {
      stdio: 'inherit',
    });
    measure.on('exit', (exitCode) => resolve(exitCode ?? 1));
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  server.kill();
}
process.exit(code);
