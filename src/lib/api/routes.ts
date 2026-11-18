/**
 * Method and path of every backend endpoint, without schemas. The browser bundle uses this table
 * (lib/api/endpoints.ts imports only the schemas each call needs); contract.ts adds roles, schemas
 * and error codes on top of it for the BFF, the mock, OpenAPI and the live check.
 */
export const API_ROUTES = {
  getHealth: { method: 'GET', path: '/health' },
  getElection: { method: 'GET', path: '/election' },
  getDisplay: { method: 'GET', path: '/display' },
  streamDisplay: { method: 'GET', path: '/display/stream', event: 'display' },
  voterSignIn: { method: 'POST', path: '/auth/login' },
  voterOtp: { method: 'POST', path: '/auth/otp' },
  voterSignOut: { method: 'POST', path: '/auth/logout' },
  getMe: { method: 'GET', path: '/me' },
  streamElection: { method: 'GET', path: '/election/stream', event: 'election' },
  getCandidates: { method: 'GET', path: '/candidates' },
  submitVote: { method: 'POST', path: '/votes' },
  adminSignIn: { method: 'POST', path: '/admin/auth/login' },
  adminSignOut: { method: 'POST', path: '/admin/auth/logout' },
  getAdminMe: { method: 'GET', path: '/admin/me' },
  getAdminOverview: { method: 'GET', path: '/admin/overview' },
  streamAdmin: { method: 'GET', path: '/admin/stream', event: 'overview' },
  changeElectionState: { method: 'POST', path: '/admin/election/{action}' },
  setDisplayScreen: { method: 'PUT', path: '/admin/display' },
  previewDisplay: { method: 'GET', path: '/admin/display/preview' },
  getAdminVoters: { method: 'GET', path: '/admin/voters' },
  getAdminResults: { method: 'GET', path: '/admin/results' },
  exportResults: { method: 'GET', path: '/admin/results/export' },
  getAdminCandidates: { method: 'GET', path: '/admin/candidates' },
  getAdminCandidate: { method: 'GET', path: '/admin/candidates/{id}' },
  createCandidate: { method: 'POST', path: '/admin/candidates' },
  updateCandidate: { method: 'PUT', path: '/admin/candidates/{id}' },
  deleteCandidate: { method: 'DELETE', path: '/admin/candidates/{id}' },
  uploadCandidatePhoto: { method: 'PUT', path: '/admin/candidates/{id}/photo', multipart: 'photo' },
  deleteCandidatePhoto: { method: 'DELETE', path: '/admin/candidates/{id}/photo' },
} as const;

export type RouteName = keyof typeof API_ROUTES;

/** Fills `{name}` placeholders: pathFor('/admin/candidates/{id}', { id: '2' }) → '/admin/candidates/2'. */
export function pathFor(path: string, params: Record<string, string> = {}): string {
  return path.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`Missing path parameter "${name}" for ${path}`);
    return encodeURIComponent(value);
  });
}

/** MSW / Express style path (`/admin/candidates/:id`) for the mock handlers. */
export function routePattern(path: string): string {
  return path.replace(/\{(\w+)\}/g, ':$1');
}
