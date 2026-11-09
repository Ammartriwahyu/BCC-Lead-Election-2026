/**
 * Scenario switcher presets. Apply with `?scenario=<name>` on any page (mock builds only)
 * or POST /api/__mock/scenario { scenario, data? }.
 */
import {
  findMemberByEmail,
  getDb,
  resetDb,
  seedVoteCounts,
  seedVotes,
  setElectionState,
  voterCount,
  type DataOptions,
  type MockDb,
} from './db';
import { DEMO_ACCOUNTS } from './fixtures';
import type { ScenarioName } from './scenario-names';

export { SCENARIOS, scenarioBodySchema, scenarioSchema, type ScenarioName } from './scenario-names';

/** "reopen" closes voting, then reopens it after this delay so a voter on /closed sees the switch. */
export const REOPEN_DELAY_MS = 8000;
/** Share of registered voters who have voted in seeded scenarios (design placeholder: 80%). */
const SEEDED_TURNOUT = 0.8;
/** Vote split used by seeded scenarios, mirroring the design placeholder (55 / 30 / 15). */
const DEFAULT_WEIGHTS = [55, 30, 15, 10, 8, 5];
/** In the "tie" scenario each of the top two gets this share of the votes. */
const TIE_TOP_SHARE = 0.4;

function seedDefault(db: MockDb): void {
  seedVotes(db, Math.round(voterCount(db) * SEEDED_TURNOUT) - 1, DEFAULT_WEIGHTS);
}

export function applyScenario(name: ScenarioName, data: Partial<DataOptions> = {}): MockDb {
  const current = getDb().options;
  const db = resetDb({ ...current, ...data });

  switch (name) {
    case 'not-started':
      break;
    case 'open':
      setElectionState(db, 'OPEN');
      break;
    case 'closed':
      seedDefault(db);
      setElectionState(db, 'CLOSED');
      break;
    case 'already-voted': {
      setElectionState(db, 'OPEN');
      const voter = findMemberByEmail(db, DEMO_ACCOUNTS.voter);
      const first = db.candidates[0];
      if (voter && first) {
        voter.status = 'VOTED';
        voter.submittedAt = new Date().toISOString();
        db.tallies.set(first.id, (db.tallies.get(first.id) ?? 0) + 1);
      }
      break;
    }
    case 'submit-fails':
      setElectionState(db, 'OPEN');
      db.submitFault = 'fail-once';
      break;
    case 'submit-lost-response':
      setElectionState(db, 'OPEN');
      db.submitFault = 'lost-response-once';
      break;
    case 'closed-mid-vote':
      setElectionState(db, 'OPEN');
      db.submitFault = 'close-on-submit';
      break;
    case 'reopen':
      seedDefault(db);
      setElectionState(db, 'CLOSED');
      db.pendingTimer = setTimeout(() => {
        const live = getDb();
        if (live === db && live.election.state === 'CLOSED') setElectionState(live, 'OPEN');
        db.pendingTimer = null;
      }, REOPEN_DELAY_MS);
      break;
    case 'zero-votes':
      db.tallies.forEach((_, key) => db.tallies.set(key, 0));
      db.members.forEach((m) => {
        m.status = 'NOT_VOTED';
        m.submittedAt = null;
      });
      setElectionState(db, 'CLOSED');
      break;
    case 'tie': {
      // Exact tie on top between candidates 1 and 2 (voted@ already gave candidate 1 one vote).
      const total = Math.round(voterCount(db) * SEEDED_TURNOUT);
      const top = Math.floor(total * TIE_TOP_SHARE);
      const others = db.candidates
        .slice(2)
        .map(() =>
          Math.max(0, Math.floor((total - 2 * top) / Math.max(1, db.candidates.length - 2))),
        );
      seedVoteCounts(db, [top - 1, top, ...others]);
      setElectionState(db, 'CLOSED');
      break;
    }
  }
  return db;
}
