import type { ResultsSummary, Turnout } from '@/lib/api/types';
import { DISPLAY_SCREENS } from '@/lib/utils/display-screens';
import { computeTurnout, summarizeResults } from '@/lib/utils/results';

import { adminSectionFor, parsePageParam, resolveAdminNextPath, votersHref } from './adminRouting';
import { displayRowStatus, displayThumbnail } from './displayControl';

describe('adminRouting', () => {
  it('maps a pathname to its sidebar section', () => {
    expect(adminSectionFor('/admin')).toBe('overview');
    expect(adminSectionFor('/admin/voters')).toBe('voters');
    expect(adminSectionFor('/admin/results')).toBe('results');
  });

  it('accepts only panel pages as ?next=', () => {
    expect(resolveAdminNextPath(null)).toBe('/admin');
    expect(resolveAdminNextPath('/admin/voters?q=abc&page=2')).toBe('/admin/voters?q=abc&page=2');
    expect(resolveAdminNextPath('/admin/results')).toBe('/admin/results');
    expect(resolveAdminNextPath('//evil.example/admin')).toBe('/admin');
    expect(resolveAdminNextPath('https://evil.example/admin')).toBe('/admin');
    expect(resolveAdminNextPath('/admin\\voters')).toBe('/admin');
    expect(resolveAdminNextPath('/candidates')).toBe('/admin');
    expect(resolveAdminNextPath('/admin/sign-in')).toBe('/admin');
    expect(resolveAdminNextPath('/admin/%')).toBe('/admin');
  });

  it('builds the voter list URL without empty parameters', () => {
    expect(votersHref('', 1)).toBe('/admin/voters');
    expect(votersHref('member 01', 1)).toBe('/admin/voters?q=member+01');
    expect(votersHref('', 3)).toBe('/admin/voters?page=3');
    expect(votersHref('a', 2)).toBe('/admin/voters?q=a&page=2');
  });

  it('reads ?page= defensively', () => {
    expect(parsePageParam(null)).toBe(1);
    expect(parsePageParam('3')).toBe(3);
    expect(parsePageParam('0')).toBe(1);
    expect(parsePageParam('-2')).toBe(1);
    expect(parsePageParam('2.5')).toBe(1);
    expect(parsePageParam('abc')).toBe(1);
  });
});

describe('displayRowStatus', () => {
  const kinds = (
    state: 'NOT_STARTED' | 'OPEN' | 'CLOSED',
    active: (typeof DISPLAY_SCREENS)[number],
  ) =>
    DISPLAY_SCREENS.map((screen) => {
      const status = displayRowStatus(screen, state, active);
      return status.kind === 'unavailable' ? status.reason : status.kind;
    });

  it('not started: only "Voting opens soon" is on air (52:3407)', () => {
    expect(kinds('NOT_STARTED', 'OPENS_SOON')).toEqual([
      'on-screen',
      'Available when voting opens',
      'Shown when voting closes',
      'Available after voting closes',
      'Available after voting closes',
      'Available after voting closes',
    ]);
  });

  it('open: only "Voting open" is on air (52:3463)', () => {
    expect(kinds('OPEN', 'VOTING_OPEN')).toEqual([
      'Only before voting opens',
      'on-screen',
      'Shown when voting closes',
      'Available after voting closes',
      'Available after voting closes',
      'Available after voting closes',
    ]);
  });

  it('closed: the four closed screens can be shown (52:3519, 52:3637)', () => {
    expect(kinds('CLOSED', 'VOTING_CLOSED')).toEqual([
      'Only before voting opens',
      'Only while voting is open',
      'on-screen',
      'available',
      'available',
      'available',
    ]);
    expect(kinds('CLOSED', 'FINAL_RESULTS')).toEqual([
      'Only before voting opens',
      'Only while voting is open',
      'available',
      'available',
      'on-screen',
      'available',
    ]);
  });
});

describe('displayThumbnail', () => {
  const turnout: Turnout = computeTurnout(300, 240);
  const tallies = (votes: number[]): ResultsSummary =>
    summarizeResults(
      votes.map((count, index) => ({
        candidateId: `c${index + 1}`,
        number: index + 1,
        name: `Candidate ${index + 1}`,
        major: 'Informatics',
        classYear: 2023,
        photoUrl: null,
        votes: count,
      })),
    );

  it('shows the live turnout on "Voting open"', () => {
    expect(displayThumbnail('VOTING_OPEN', { turnout })).toBe('80.0%');
    expect(displayThumbnail('VOTING_OPEN', {})).toBe('Open');
  });

  it('lists the votes on "Final results" only when totals are given and fit', () => {
    expect(displayThumbnail('FINAL_RESULTS', { turnout })).toBe('Results');
    expect(displayThumbnail('FINAL_RESULTS', { results: tallies([132, 72, 36]) })).toBe(
      '132 · 72 · 36',
    );
    expect(displayThumbnail('FINAL_RESULTS', { results: tallies([1, 2, 3, 4]) })).toBe('Results');
    expect(displayThumbnail('FINAL_RESULTS', { results: tallies([]) })).toBe('Results');
  });

  it('uses the design labels for the other screens', () => {
    expect(displayThumbnail('OPENS_SOON', { turnout })).toBe('Soon');
    expect(displayThumbnail('VOTING_CLOSED', { turnout })).toBe('Closed');
    expect(displayThumbnail('WINNER_REVEAL', { turnout })).toBe('? ? ?');
    expect(displayThumbnail('MOST_VOTES', { turnout })).toBe('Most votes');
  });
});
