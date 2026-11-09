/**
 * In-memory mock database, shared by every tab, booth device and the display
 * because it lives in the Next server process (globalThis survives HMR).
 *
 * Privacy by design, even in the mock: votes are stored as per-candidate tallies.
 * Nothing links a member to a candidate.
 */
import type { CandidateDto, ElectionDto } from '@/lib/api/schemas';
import type { DisplayScreen, ElectionState } from '@/lib/api/types';
import { autoScreenFor } from '@/lib/utils/display-screens';

import {
  buildMembers,
  CANDIDATE_SETS,
  COMMITTEE,
  DEFAULT_VOTER_COUNT,
  type CandidateSet,
  type CommitteeFixture,
} from './fixtures';

export interface MemberRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  isVoter: boolean;
  status: 'NOT_VOTED' | 'VOTED';
  submittedAt: string | null;
}

export interface Session {
  role: 'voter' | 'admin';
  userId: string;
}

export type SubmitFault = 'none' | 'fail-once' | 'lost-response-once' | 'close-on-submit';

export interface DataOptions {
  candidateSet: CandidateSet;
  voterCount: number;
}

export interface MockDb {
  options: DataOptions;
  election: ElectionDto;
  candidates: CandidateDto[];
  members: Map<string, MemberRecord>;
  committee: CommitteeFixture[];
  tallies: Map<string, number>;
  sessions: Map<string, Session>;
  /** Idempotency-Key -> stored receipt, so a retry never creates a second vote. */
  idempotency: Map<string, { memberId: string; submittedAt: string }>;
  display: { activeScreen: DisplayScreen; version: number };
  submitFault: SubmitFault;
  /** Timer for the "reopen" scenario. */
  pendingTimer: ReturnType<typeof setTimeout> | null;
  /** Count of POST /votes requests that reached the server (for e2e double-submit checks). */
  voteRequests: number;
}

const GLOBAL_KEY = '__pilketumMockDb__';

type GlobalWithDb = typeof globalThis & { [GLOBAL_KEY]?: MockDb };

export const DEFAULT_OPTIONS: DataOptions = {
  candidateSet: 'default',
  voterCount: DEFAULT_VOTER_COUNT,
};

function createDb(options: DataOptions): MockDb {
  const candidates = structuredClone(CANDIDATE_SETS[options.candidateSet]);
  const members = new Map<string, MemberRecord>();
  const tallies = new Map(candidates.map((c) => [c.id, 0]));
  const now = new Date().toISOString();

  buildMembers(options.voterCount).forEach((m) => {
    members.set(m.id, {
      id: m.id,
      name: m.name,
      email: m.email.toLowerCase(),
      password: m.password,
      isVoter: m.isVoter,
      status: m.votedInitially ? 'VOTED' : 'NOT_VOTED',
      submittedAt: m.votedInitially ? now : null,
    });
    if (m.votedInitially) {
      // Pre-existing votes (voted@bcc.test) always count for candidate 1, keeping scenarios deterministic.
      const target = candidates[0];
      if (target) tallies.set(target.id, (tallies.get(target.id) ?? 0) + 1);
    }
  });

  return {
    options,
    election: { state: 'NOT_STARTED', version: 1, updatedAt: now },
    candidates,
    members,
    committee: structuredClone(COMMITTEE),
    tallies,
    sessions: new Map(),
    idempotency: new Map(),
    display: { activeScreen: 'OPENS_SOON', version: 1 },
    submitFault: 'none',
    pendingTimer: null,
    voteRequests: 0,
  };
}

export function getDb(): MockDb {
  const g = globalThis as GlobalWithDb;
  g[GLOBAL_KEY] ??= createDb(DEFAULT_OPTIONS);
  return g[GLOBAL_KEY];
}

/** Resets all demo data. Sessions are dropped too, so every device returns to sign-in. */
export function resetDb(options: DataOptions = getDb().options): MockDb {
  const g = globalThis as GlobalWithDb;
  const previous = g[GLOBAL_KEY];
  if (previous?.pendingTimer) clearTimeout(previous.pendingTimer);
  g[GLOBAL_KEY] = createDb(options);
  return g[GLOBAL_KEY];
}

/* ---------- helpers used by handlers and scenarios ---------- */

export function voterCount(db: MockDb): number {
  let count = 0;
  db.members.forEach((m) => {
    if (m.isVoter) count += 1;
  });
  return count;
}

export function votesReceived(db: MockDb): number {
  let sum = 0;
  db.tallies.forEach((v) => {
    sum += v;
  });
  return sum;
}

export function setElectionState(db: MockDb, state: ElectionState): void {
  db.election = { state, version: db.election.version + 1, updatedAt: new Date().toISOString() };
  // State changes drive the display automatically; result screens need an explicit Show on display.
  db.display = { activeScreen: autoScreenFor(state), version: db.display.version + 1 };
}

export function recordVote(db: MockDb, member: MemberRecord, candidateId: string): string {
  const submittedAt = new Date().toISOString();
  member.status = 'VOTED';
  member.submittedAt = submittedAt;
  db.tallies.set(candidateId, (db.tallies.get(candidateId) ?? 0) + 1);
  return submittedAt;
}

/**
 * Marks `count` not-yet-voted members as voted, spreading votes by `weights`
 * (one weight per candidate, in candidate order). Demo accounts are skipped
 * so they stay usable.
 */
export function seedVotes(db: MockDb, count: number, weights: readonly number[]): void {
  const used = weights.slice(0, db.candidates.length);
  const totalWeight = used.reduce((a, b) => a + b, 0) || 1;
  const perCandidate = db.candidates.map((_, i) =>
    Math.floor(((used[i] ?? 0) / totalWeight) * count),
  );
  let assigned = perCandidate.reduce((a, b) => a + b, 0);
  for (
    let i = 0;
    assigned < count && db.candidates.length > 0;
    i = (i + 1) % db.candidates.length
  ) {
    perCandidate[i] = (perCandidate[i] ?? 0) + 1;
    assigned += 1;
  }
  seedVoteCounts(db, perCandidate);
}

/** Marks members as voted so that candidate i receives exactly counts[i] extra votes. */
export function seedVoteCounts(db: MockDb, counts: readonly number[]): void {
  const pool = [...db.members.values()].filter(
    (m) => m.isVoter && m.status === 'NOT_VOTED' && !m.email.endsWith('@bcc.test'),
  );
  let cursor = 0;
  db.candidates.forEach((candidate, i) => {
    for (let k = 0; k < (counts[i] ?? 0); k += 1) {
      const member = pool[cursor];
      if (!member) return;
      cursor += 1;
      recordVote(db, member, candidate.id);
    }
  });
}

export function findMemberByEmail(db: MockDb, email: string): MemberRecord | undefined {
  const needle = email.trim().toLowerCase();
  for (const m of db.members.values()) {
    if (m.email === needle) return m;
  }
  return undefined;
}
