/**
 * Live contract check against the Pilketum backend (staging), or in-process against the mock.
 * Read-only: never votes, never changes the voting state, the display or a candidate.
 *
 * Usage:
 *   pnpm contract:check https://staging-api.example.org      (backend origin; paths add /api)
 *   pnpm contract:check --mock                               (the mock backend, demo accounts)
 *
 * Optional test accounts enable the signed-in checks (never real voters' passwords: ask the
 * backend team for test accounts):
 *   CONTRACT_VOTER_USERNAME / CONTRACT_VOTER_PASSWORD   (NIM or UB email, without 2FA)
 *   CONTRACT_ADMIN_USERNAME / CONTRACT_ADMIN_PASSWORD
 * Exit code 1 when any check fails.
 */
import {
  checkContract,
  type CheckOptions,
  type CheckResult,
  type Credentials,
} from '../src/lib/api/contractCheck';

function credentials(prefix: 'VOTER' | 'ADMIN'): Credentials | undefined {
  const username = process.env[`CONTRACT_${prefix}_USERNAME`];
  const password = process.env[`CONTRACT_${prefix}_PASSWORD`];
  return username && password ? { username, password } : undefined;
}

const MARK: Record<CheckResult['status'], string> = { pass: 'PASS', fail: 'FAIL', skip: 'SKIP' };

async function options(args: readonly string[]): Promise<CheckOptions | null> {
  if (args.includes('--mock')) {
    const { handleMockRequest, MOCK_BACKEND_ORIGIN } = await import('../src/mocks/server');
    const { DEMO_ACCOUNTS, DEMO_PASSWORD } = await import('../src/mocks/fixtures');
    return {
      baseUrl: MOCK_BACKEND_ORIGIN,
      fetch: handleMockRequest,
      voter: { username: DEMO_ACCOUNTS.voter, password: DEMO_PASSWORD.voter },
      admin: { username: DEMO_ACCOUNTS.committee, password: DEMO_PASSWORD.committee },
    };
  }
  const baseUrl = args.find((arg) => !arg.startsWith('-'));
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) return null;
  const voter = credentials('VOTER');
  const admin = credentials('ADMIN');
  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    ...(voter ? { voter } : {}),
    ...(admin ? { admin } : {}),
  };
}

async function main(args: readonly string[]): Promise<number> {
  const resolved = await options(args);
  if (!resolved) {
    console.error('Usage: pnpm contract:check <backendOrigin> | --mock');
    return 2;
  }
  const results = await checkContract(resolved);
  const width = Math.max(...results.map((r) => r.check.length));
  for (const result of results) {
    console.log(`${MARK[result.status]}  ${result.check.padEnd(width)}  ${result.detail}`);
  }
  const failed = results.filter((r) => r.status === 'fail').length;
  const passed = results.filter((r) => r.status === 'pass').length;
  console.log(`\n${passed} passed, ${failed} failed, ${results.length - passed - failed} skipped`);
  return failed > 0 ? 1 : 0;
}

void main(process.argv.slice(2)).then((code) => process.exit(code));
