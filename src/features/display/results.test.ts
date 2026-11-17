import { DISPLAY } from '@/config/constants';
import type { CandidateTally } from '@/lib/api/types';
import { summarizeResults } from '@/lib/utils/results';

import { leaderIds, podiumBarHeight, podiumOrder, rankedBarRatio, resultsLayout } from './results';

const tallies = (votes: number[]): CandidateTally[] =>
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
  ).candidates;

describe('podiumOrder', () => {
  it('puts first in the middle, second left, third right', () => {
    expect(podiumOrder(['1st', '2nd', '3rd'])).toEqual(['2nd', '1st', '3rd']);
    expect(podiumOrder(['1st', '2nd'])).toEqual(['2nd', '1st']);
    expect(podiumOrder(['1st'])).toEqual(['1st']);
    expect(podiumOrder([])).toEqual([]);
  });
});

describe('podiumBarHeight', () => {
  it('matches the Figma bars (55 / 30 / 15 % -> 400 / 218 / 109 px)', () => {
    expect(podiumBarHeight(0.55, 0.55)).toBe(400);
    expect(podiumBarHeight(0.3, 0.55)).toBe(218);
    expect(podiumBarHeight(0.15, 0.55)).toBe(109);
  });

  it('keeps room for the share label and handles zero votes', () => {
    expect(podiumBarHeight(0.01, 0.9)).toBe(DISPLAY.podiumMinBarPx);
    expect(podiumBarHeight(0, 0)).toBe(DISPLAY.podiumMinBarPx);
  });
});

describe('ranked list', () => {
  it('is used for more than three candidates', () => {
    expect(resultsLayout(tallies([3, 2, 1]))).toBe('podium');
    expect(resultsLayout(tallies([4, 3, 2, 1]))).toBe('ranked');
  });

  it('scales bars to the top share', () => {
    expect(rankedBarRatio(0.4, 0.4)).toBe(1);
    expect(rankedBarRatio(0.2, 0.4)).toBe(0.5);
    expect(rankedBarRatio(0, 0)).toBe(0);
  });
});

describe('leaderIds', () => {
  it('marks every candidate on the top count, none with zero votes', () => {
    expect([...leaderIds(summarizeResults(tallies([5, 5, 1])))]).toEqual(['c1', 'c2']);
    expect(leaderIds(summarizeResults(tallies([0, 0])))).toEqual(new Set());
  });
});
