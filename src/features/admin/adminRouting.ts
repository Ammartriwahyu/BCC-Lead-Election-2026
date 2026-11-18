/** Pure routing helpers for the committee panel. */
import type { AdminSection } from '@/components/layout/AdminSidebar';
import { ROUTES } from '@/config/constants';

const SECTION_PATHS: Record<AdminSection, string> = {
  overview: ROUTES.adminOverview,
  candidates: ROUTES.adminCandidates,
  voters: ROUTES.adminVoters,
  results: ROUTES.adminResults,
};

export function adminSectionFor(pathname: string): AdminSection {
  if (pathname.startsWith(ROUTES.adminCandidates)) return 'candidates';
  if (pathname.startsWith(ROUTES.adminVoters)) return 'voters';
  if (pathname.startsWith(ROUTES.adminResults)) return 'results';
  return 'overview';
}

/** Candidate form pages: /admin/candidates/new and /admin/candidates/{id}/edit. */
const CANDIDATE_FORM_PATH = /^\/admin\/candidates\/(new|\d+\/edit)$/;

/** Breadcrumb after "Election /" for a panel path. */
export function adminTrailFor(
  pathname: string,
  names: Record<AdminSection, string>,
  sub: { add: string; edit: string },
): string[] {
  const section = adminSectionFor(pathname);
  if (section === 'candidates' && pathname.endsWith('/new')) return [names.candidates, sub.add];
  if (section === 'candidates' && pathname.endsWith('/edit')) return [names.candidates, sub.edit];
  return [names[section]];
}

/**
 * `?next=` after committee sign-in: only the panel pages (query string kept, e.g. the
 * voter search). Absolute URLs, //host and anything else fall back to the overview.
 */
export function resolveAdminNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return ROUTES.adminOverview;
  }
  let pathname: string;
  try {
    pathname = new URL(next, 'http://localhost').pathname;
  } catch {
    return ROUTES.adminOverview;
  }
  return Object.values(SECTION_PATHS).includes(pathname) || CANDIDATE_FORM_PATH.test(pathname)
    ? next
    : ROUTES.adminOverview;
}

/** `/admin/voters?q=&page=`: empty search and page 1 are left out of the URL. */
export function votersHref(q: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `${ROUTES.adminVoters}?${query}` : ROUTES.adminVoters;
}

/** Reads `?page=`: anything that is not a positive integer means page 1. */
export function parsePageParam(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  return Math.max(1, Number.parseInt(value, 10));
}
