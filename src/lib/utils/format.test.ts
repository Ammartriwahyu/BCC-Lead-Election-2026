import {
  formatCandidateNumber,
  formatDateWib,
  formatNumber,
  formatPercent,
  formatTimeWib,
} from './format';

describe('format', () => {
  it('formats percentages with one decimal (en-US)', () => {
    expect(formatPercent(0.55)).toBe('55.0%');
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(1 / 3)).toBe('33.3%');
    expect(formatPercent(Number.NaN)).toBe('0.0%');
  });

  it('formats numbers with grouping', () => {
    expect(formatNumber(1000)).toBe('1,000');
  });

  it('formats time in WIB regardless of the runtime time zone', () => {
    const date = new Date('2026-11-09T02:41:00Z');
    expect(formatTimeWib(date)).toBe('09:41 WIB');
    expect(formatDateWib(date)).toBe('Nov 9, 2026');
    // 23:30 UTC is already the next day in WIB.
    expect(formatDateWib(new Date('2026-11-09T23:30:00Z'))).toBe('Nov 10, 2026');
  });

  it('pads candidate numbers', () => {
    expect(formatCandidateNumber(1)).toBe('01');
    expect(formatCandidateNumber(12)).toBe('12');
  });
});
