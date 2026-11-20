/** One-line summary per endpoint for docs/openapi.json. Kept out of contract.ts so the browser bundle stays small. */
import type { EndpointName } from './contract';

export const ENDPOINT_SUMMARIES: Record<EndpointName, string> = {
  getHealth: 'Liveness',
  getElection: 'Voting status for the sign-in page (not_started, open, closed) and server time',
  streamElection:
    'Server-sent events for a signed-in voter: the /election body on connect and on every state change (the pages poll instead)',
  getDisplay: 'Payload of the screen on air, nothing else',
  streamDisplay: 'Server-sent events: the /display payload on connect and on every change',
  voterSignIn: 'UB SSO sign-in with NIM or UB email. Either a session or an OTP challenge (2FA)',
  voterOtp: 'Second step for 2FA accounts. OTP_INVALID returns a new flow',
  voterSignOut: 'Ends the voter session',
  getMe: 'The signed-in voter (has_voted) and the voting status',
  getCandidates: 'All candidates with vision and missions, by ballot number',
  submitVote: 'Casts the vote. Final. The backend keeps no link between voter and candidate',
  adminSignIn: 'Committee sign-in',
  adminSignOut: 'Ends the committee session (Next server route; backend POST /auth/logout)',
  getAdminMe: 'The signed-in committee account',
  getAdminOverview: 'Status, screen on air, candidate count, turnout. Never votes per candidate',
  streamAdmin:
    'Server-sent events: the /admin/overview payload on connect and on change (the panel polls instead)',
  changeElectionState:
    'open (not_started→open, needs 3 complete candidates), close (open→closed), reopen (closed→open)',
  setDisplayScreen: 'Puts a result screen on the public display. Only while closed',
  previewDisplay: 'Payload of a screen without putting it on air',
  getAdminVoters: 'Voter list page. search matches name, email or NIM',
  getAdminResults:
    'Votes per candidate, leaders, ties, integrity check. Live while open, final once closed (committee only)',
  exportResults: 'Excel file (Summary, Results, Voters). Only while closed',
  getAdminCandidates: 'All candidates (same as GET /candidates)',
  getAdminCandidate: 'One candidate',
  createCandidate: 'Adds a candidate. Only before voting first opens; ballot numbers 1–3',
  updateCandidate: 'Replaces a candidate (all fields)',
  deleteCandidate: 'Removes a candidate and its photo',
  uploadCandidatePhoto: 'Uploads the photo (multipart field "photo", JPG/PNG up to 2 MB)',
  deleteCandidatePhoto: 'Removes the photo',
};
