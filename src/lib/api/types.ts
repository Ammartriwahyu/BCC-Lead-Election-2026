/**
 * Domain models used by the app. DTOs (schemas.ts) are mapped to these once, in endpoints.ts,
 * so a change in the backend's wire format stops at lib/api.
 */

export type ElectionState = 'NOT_STARTED' | 'OPEN' | 'CLOSED';
export type VoterStatus = 'NOT_VOTED' | 'VOTED';
export type DisplayScreen =
  'OPENS_SOON' | 'VOTING_OPEN' | 'VOTING_CLOSED' | 'WINNER_REVEAL' | 'FINAL_RESULTS' | 'MOST_VOTES';
export type ElectionAction = 'open' | 'close' | 'reopen';

/** Error codes the UI acts on. Backend codes are mapped to these in errorResponse.ts. */
export type ErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'NOT_A_VOTER'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'RATE_LIMITED'
  | 'SSO_UNAVAILABLE'
  | 'SSO_BUSY'
  | 'ALREADY_VOTED'
  | 'VOTING_NOT_OPEN'
  | 'STATE_CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RESULTS_LOCKED'
  | 'CANDIDATES_LOCKED'
  | 'CANDIDATES_INCOMPLETE'
  | 'BALLOT_NUMBER_TAKEN'
  | 'PHOTO_TOO_LARGE'
  | 'PHOTO_INVALID'
  | 'VALIDATION'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface Election {
  state: ElectionState;
}

export interface VoterMe {
  /** NIM. */
  id: string;
  name: string;
  email: string | null;
  status: VoterStatus;
  /** When the ballot was cast (backend `voted_at`), or this device's time right after submitting. */
  submittedAt: Date | null;
}

export interface VoterSession {
  voter: VoterMe;
  election: Election;
}

export interface OtpDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface OtpChallenge {
  flow: string;
  devices: OtpDevice[];
}

export type SignInResult =
  { kind: 'signed-in'; session: VoterSession } | { kind: 'otp'; challenge: OtpChallenge };

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

/** What the committee form sends (create and update). */
export interface CandidateInput {
  number: number;
  name: string;
  major: string;
  classYear: number;
  vision: string;
  missions: string[];
}

export interface VoteReceipt {
  /** Device clock when the API confirmed the vote. */
  submittedAt: Date;
}

export interface AdminMe {
  username: string;
  /** Shown in the topbar ("Election Committee"); the username when the backend sends none. */
  displayName: string;
}

export interface DisplayControl {
  activeScreen: DisplayScreen;
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
  candidateCount: number;
  display: DisplayControl;
  /** Voting has opened at least once: candidates are locked for good (backend `candidates_locked`). */
  candidatesLocked: boolean;
}

export interface AdminVoter {
  /** NIM. */
  id: string;
  name: string;
  email: string | null;
  status: VoterStatus;
}

export interface AdminVotersPage {
  items: AdminVoter[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  turnout: Turnout;
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
  /** Ballots match the members who voted. false: results must not be announced. */
  integrityOk: boolean;
}

export interface DisplayCandidate {
  number: number;
  name: string;
  photoUrl: string | null;
}

export type DisplayPayload =
  | { screen: 'OPENS_SOON'; candidates: DisplayCandidate[] }
  | { screen: 'VOTING_OPEN'; turnout: Turnout }
  | { screen: 'VOTING_CLOSED'; turnout: Turnout }
  | { screen: 'WINNER_REVEAL'; turnout: Turnout; candidateNumbers: number[] }
  | { screen: 'FINAL_RESULTS'; turnout: Turnout; results: ResultsSummary }
  | { screen: 'MOST_VOTES'; turnout: Turnout; results: ResultsSummary };

export interface ExportFile {
  blob: Blob;
  fileName: string;
}
