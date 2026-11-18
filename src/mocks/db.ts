/**
 * In-memory mock backend database, shared by every tab, booth device and the display
 * because it lives in the Next server process (globalThis survives HMR).
 *
 * Privacy by design, even in the mock: votes are stored as per-candidate tallies plus a "has voted"
 * flag. Nothing links a member to a candidate (backend doc: one anonymous ballot).
 */
import type { DisplayScreenDto, ElectionStatusDto } from '@/lib/api/schemas';

import {
  buildMembers,
  CANDIDATE_SETS,
  COMMITTEE,
  DEFAULT_VOTER_COUNT,
  type CandidateSet,
  type CommitteeFixture,
} from './fixtures';
import { MOCK_PHOTOS } from './photos';

export interface MemberRecord {
  nim: string;
  name: string;
  email: string | null;
  password: string;
  isVoter: boolean;
  hasVoted: boolean;
  department: string;
  classYear: number;
  studyProgram: string;
  sso: 'otp' | 'down' | 'busy' | undefined;
}

export interface PhotoRecord {
  file: string;
  type: string;
  bytes: Uint8Array;
}

export interface CandidateRecord {
  id: number;
  ballotNumber: number;
  fullName: string;
  studyProgram: string;
  classYear: number;
  vision: string;
  missions: string[];
  photo: PhotoRecord | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  role: 'voter' | 'admin';
  userId: string;
  expiresAt: number;
}

export type SubmitFault = 'none' | 'fail-once' | 'lost-response-once' | 'close-on-submit';

export interface DataOptions {
  candidateSet: CandidateSet;
  voterCount: number;
}

export interface MockDb {
  options: DataOptions;
  status: ElectionStatusDto;
  displayScreen: DisplayScreenDto;
  openedAt: string | null;
  closedAt: string | null;
  /** Candidates and the register lock for good once voting has opened. */
  everOpened: boolean;
  candidates: CandidateRecord[];
  nextCandidateId: number;
  members: Map<string, MemberRecord>;
  committee: CommitteeFixture[];
  /** candidate id -> votes. */
  tallies: Map<number, number>;
  /** Bearer token -> session. */
  sessions: Map<string, Session>;
  /** OTP flow -> member NIM. */
  otpFlows: Map<string, { nim: string; expiresAt: number }>;
  /** Failed sign-ins per username (RATE_LIMITED after MOCK_RATE_LIMIT.attempts). */
  failedLogins: Map<string, number>;
  photos: Map<string, PhotoRecord>;
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

function decodeBase64(data: string): Uint8Array {
  return Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
}

export function storePhoto(db: MockDb, bytes: Uint8Array, type: string): PhotoRecord {
  const extension = type === 'image/png' ? 'png' : 'jpg';
  const photo = { file: `${crypto.randomUUID()}.${extension}`, type, bytes };
  db.photos.set(photo.file, photo);
  return photo;
}

function createDb(options: DataOptions): MockDb {
  const now = new Date().toISOString();
  const db: MockDb = {
    options,
    status: 'not_started',
    displayScreen: 'voting_opens_soon',
    openedAt: null,
    closedAt: null,
    everOpened: false,
    candidates: [],
    nextCandidateId: 1,
    members: new Map(),
    committee: structuredClone(COMMITTEE),
    tallies: new Map(),
    sessions: new Map(),
    otpFlows: new Map(),
    failedLogins: new Map(),
    photos: new Map(),
    submitFault: 'none',
    pendingTimer: null,
    voteRequests: 0,
  };

  for (const fixture of CANDIDATE_SETS[options.candidateSet]) {
    const photoData = fixture.photo === null ? undefined : MOCK_PHOTOS[fixture.photo];
    const record: CandidateRecord = {
      id: db.nextCandidateId,
      ballotNumber: fixture.ballotNumber,
      fullName: fixture.fullName,
      studyProgram: fixture.studyProgram,
      classYear: fixture.classYear,
      vision: fixture.vision,
      missions: [...fixture.missions],
      photo: photoData ? storePhoto(db, decodeBase64(photoData), 'image/png') : null,
      createdAt: now,
      updatedAt: now,
    };
    db.nextCandidateId += 1;
    db.candidates.push(record);
    db.tallies.set(record.id, 0);
  }

  for (const m of buildMembers(options.voterCount)) {
    db.members.set(m.nim, {
      nim: m.nim,
      name: m.name,
      email: m.email?.toLowerCase() ?? null,
      password: m.password,
      isVoter: m.isVoter,
      hasVoted: m.votedInitially,
      department: m.department,
      classYear: m.classYear,
      studyProgram: m.studyProgram,
      sso: m.sso,
    });
    if (m.votedInitially) {
      // Pre-existing votes (voted@bcc.test) always count for ballot 1, keeping scenarios deterministic.
      const target = db.candidates[0];
      if (target) db.tallies.set(target.id, (db.tallies.get(target.id) ?? 0) + 1);
    }
  }
  return db;
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
  const next = createDb(options);
  g[GLOBAL_KEY] = next;
  return next;
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
  let count = 0;
  db.members.forEach((m) => {
    if (m.isVoter && m.hasVoted) count += 1;
  });
  return count;
}

export function totalBallots(db: MockDb): number {
  let sum = 0;
  db.tallies.forEach((v) => {
    sum += v;
  });
  return sum;
}

const AUTO_SCREEN: Record<ElectionStatusDto, DisplayScreenDto> = {
  not_started: 'voting_opens_soon',
  open: 'voting_open',
  closed: 'voting_closed',
};

export function setElectionStatus(db: MockDb, status: ElectionStatusDto): void {
  const now = new Date().toISOString();
  db.status = status;
  if (status === 'open') {
    db.everOpened = true;
    db.openedAt ??= now;
    db.closedAt = null;
  }
  if (status === 'closed') db.closedAt = now;
  // State changes drive the display automatically; result screens need an explicit choice.
  db.displayScreen = AUTO_SCREEN[status];
}

export function recordVote(db: MockDb, member: MemberRecord, candidateId: number): void {
  member.hasVoted = true;
  db.tallies.set(candidateId, (db.tallies.get(candidateId) ?? 0) + 1);
}

/**
 * Marks `count` not-yet-voted members as voted, spreading votes by `weights`
 * (one weight per candidate, in ballot order). Demo accounts are skipped so they stay usable.
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

/** Marks members as voted so that candidate i (ballot order) receives exactly counts[i] votes. */
export function seedVoteCounts(db: MockDb, counts: readonly number[]): void {
  const pool = [...db.members.values()].filter(
    (m) => m.isVoter && !m.hasVoted && !m.email?.endsWith('@bcc.test'),
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

/** UB SSO accepts NIM or email. */
export function findMember(db: MockDb, username: string): MemberRecord | undefined {
  const needle = username.trim().toLowerCase();
  if (db.members.has(needle)) return db.members.get(needle);
  for (const m of db.members.values()) {
    if (m.email === needle) return m;
  }
  return undefined;
}

export const isComplete = (c: CandidateRecord) => c.photo !== null;
