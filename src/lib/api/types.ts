/**
 * Domain models used by the app. DTOs (schemas.ts) are mapped to these once, in endpoints.ts.
 */
import type { z } from 'zod';

import type {
  displayScreenSchema,
  electionActionSchema,
  electionStateSchema,
  errorCodeSchema,
  voterStatusSchema,
} from './schemas';

export type ElectionState = z.infer<typeof electionStateSchema>;
export type VoterStatus = z.infer<typeof voterStatusSchema>;
export type DisplayScreen = z.infer<typeof displayScreenSchema>;
export type ElectionAction = z.infer<typeof electionActionSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export interface Election {
  state: ElectionState;
  version: number;
  updatedAt: Date;
}

export interface VoterMe {
  id: string;
  name: string;
  email: string;
  status: VoterStatus;
  submittedAt: Date | null;
}

export interface VoterSession {
  voter: VoterMe;
  election: Election;
}

export interface Candidate {
  id: string;
  number: number;
  name: string;
  major: string;
  classYear: number;
  photoUrl: string | null;
  vision: string;
  missions: string[];
}

export interface VoteReceipt {
  submittedAt: Date;
}

export interface AdminMe {
  id: string;
  name: string;
  email: string;
}

export interface DisplayControl {
  activeScreen: DisplayScreen;
  version: number;
}

export interface Turnout {
  registeredVoters: number;
  votesReceived: number;
  notVoted: number;
  /** 0..1 */
  ratio: number;
}

export interface AdminOverview {
  election: Election;
  turnout: Turnout;
  display: DisplayControl;
}

export interface AdminVoter {
  id: string;
  name: string;
  email: string;
  status: VoterStatus;
}

export interface AdminVotersPage {
  items: AdminVoter[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  turnout: Turnout;
  election: Election;
}

export interface CandidateTally {
  candidateId: string;
  number: number;
  name: string;
  major: string;
  classYear: number;
  photoUrl: string | null;
  votes: number;
  /** 0..1 of valid votes */
  share: number;
}

export interface ResultsSummary {
  /** Sorted by votes desc, then candidate number. */
  candidates: CandidateTally[];
  validVotes: number;
  /** Every candidate sharing the top vote count. Empty when there are no votes. */
  leaders: CandidateTally[];
  isTie: boolean;
}

export interface AdminResults {
  election: Election;
  turnout: Turnout;
  results: ResultsSummary;
  display: DisplayControl;
}

export interface DisplayCandidate {
  number: number;
  name: string;
  photoUrl: string | null;
}

export type DisplayPayload =
  | { screen: 'OPENS_SOON'; version: number; candidates: DisplayCandidate[] }
  | { screen: 'VOTING_OPEN'; version: number; turnout: Turnout }
  | { screen: 'VOTING_CLOSED'; version: number; turnout: Turnout }
  | { screen: 'WINNER_REVEAL'; version: number; turnout: Turnout }
  | { screen: 'FINAL_RESULTS'; version: number; turnout: Turnout; results: ResultsSummary }
  | { screen: 'MOST_VOTES'; version: number; turnout: Turnout; results: ResultsSummary };
