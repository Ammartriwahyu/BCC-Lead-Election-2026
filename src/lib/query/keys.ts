/** Query key factory. Voter and admin data live under separate roots so sign-out can clear them independently. */
export const queryKeys = {
  election: ['election'] as const,
  voter: {
    all: ['voter'] as const,
    me: ['voter', 'me'] as const,
    candidates: ['voter', 'candidates'] as const,
    candidate: (id: string) => ['voter', 'candidates', id] as const,
  },
  admin: {
    all: ['admin'] as const,
    me: ['admin', 'me'] as const,
    overview: ['admin', 'overview'] as const,
    voters: (q: string, page: number) => ['admin', 'voters', { q, page }] as const,
    results: ['admin', 'results'] as const,
  },
  display: ['display'] as const,
};
