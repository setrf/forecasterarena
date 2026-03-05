import { describe, expect, it, vi } from 'vitest';
import {
  calculateImpliedConfidence,
  calculateBrierScore,
  calculateAggregateBrier,
  interpretBrierScore,
  calculateBrierSkillScore,
  formatBrierScore
} from '@/lib/scoring/brier';
import {
  calculatePositionValue,
  calculateSettlementValue,
  calculateRealizedPnL,
  calculateUnrealizedPnL,
  calculateTotalValue,
  calculateTotalPnL,
  calculatePnLPercent,
  calculateROI,
  formatPnL,
  formatPercent,
  calculatePortfolioSummary
} from '@/lib/scoring/pnl';
import {
  constantTimeCompare,
  verifyCronSecret,
  verifyAdminPassword,
  safeErrorMessage,
  parseIntParam
} from '@/lib/utils/security';

describe('scoring/brier', () => {
  it('calculates implied confidence with cap and zero-max guard', () => {
    expect(calculateImpliedConfidence(100, 10_000)).toBeCloseTo(0.04, 8);
    expect(calculateImpliedConfidence(10_000, 100)).toBe(1);
    expect(calculateImpliedConfidence(100, 0)).toBe(0);
  });

  it('calculates brier score for binary YES and NO bets', () => {
    expect(calculateBrierScore(0.8, 'YES', 'YES')).toBeCloseTo(0.04, 8);
    expect(calculateBrierScore(0.8, 'YES', 'NO')).toBeCloseTo(0.64, 8);
    expect(calculateBrierScore(0.8, 'NO', 'YES')).toBeCloseTo(0.64, 8);
    expect(calculateBrierScore(0.8, 'NO', 'NO')).toBeCloseTo(0.04, 8);
  });

  it('calculates brier score for multi-outcome markets', () => {
    expect(calculateBrierScore(0.7, 'Candidate A', 'Candidate A')).toBeCloseTo(0.09, 8);
    expect(calculateBrierScore(0.7, 'Candidate A', 'Candidate B')).toBeCloseTo(0.49, 8);
  });

  it('calculates aggregate, interpretation, skill score, and formatting', () => {
    expect(calculateAggregateBrier([])).toBe(0);
    expect(calculateAggregateBrier([0.1, 0.2, 0.3])).toBeCloseTo(0.2, 8);

    expect(interpretBrierScore(0.05)).toBe('Excellent');
    expect(interpretBrierScore(0.15)).toBe('Good');
    expect(interpretBrierScore(0.25)).toBe('Fair');
    expect(interpretBrierScore(0.35)).toBe('Poor');
    expect(interpretBrierScore(0.45)).toBe('Very Poor');

    expect(calculateBrierSkillScore(0.1)).toBeCloseTo(0.6, 8);
    expect(calculateBrierSkillScore(0.4, 0.2)).toBeCloseTo(-1, 8);

    expect(formatBrierScore(null)).toBe('N/A');
    expect(formatBrierScore(0.123456)).toBe('0.1235');
  });
});

describe('scoring/pnl', () => {
  it('calculates position value for YES, NO, and multi-outcome sides', () => {
    expect(calculatePositionValue(100, 'YES', 0.6)).toBeCloseTo(60, 8);
    expect(calculatePositionValue(100, 'NO', 0.6)).toBeCloseTo(40, 8);
    expect(calculatePositionValue(100, 'Candidate A', 0.6)).toBeCloseTo(60, 8);
  });

  it('calculates settlement, realized/unrealized pnl, and totals', () => {
    expect(calculateSettlementValue(50, 'YES', 'YES')).toBe(50);
    expect(calculateSettlementValue(50, 'YES', 'NO')).toBe(0);
    expect(calculateSettlementValue(50, 'Candidate A', 'candidate a')).toBe(50);

    expect(calculateRealizedPnL(120, 100)).toBe(20);
    expect(calculateUnrealizedPnL(90, 100)).toBe(-10);
    expect(calculateTotalValue(9000, 1500)).toBe(10_500);
    expect(calculateTotalPnL(10_500)).toBe(500);
    expect(calculateTotalPnL(10_500, 12_000)).toBe(-1500);
  });

  it('calculates percentages and ROI with zero guards', () => {
    expect(calculatePnLPercent(500)).toBeCloseTo(5, 8);
    expect(calculatePnLPercent(500, 0)).toBe(0);
    expect(calculateROI(10_500)).toBeCloseTo(0.05, 8);
    expect(calculateROI(10_500, 0)).toBe(0);
  });

  it('formats pnl/percent and computes portfolio summary', () => {
    expect(formatPnL(12.345)).toBe('+$12.35');
    expect(formatPnL(-12.345)).toBe('$-12.35');
    expect(formatPnL(12.345, false)).toBe('$12.35');

    expect(formatPercent(3.14159)).toBe('+3.14%');
    expect(formatPercent(-3.14159)).toBe('-3.14%');
    expect(formatPercent(3.14159, false)).toBe('3.14%');

    const summary = calculatePortfolioSummary(9000, [
      { current_value: 300, total_cost: 200 },
      { current_value: 100, total_cost: 120 }
    ]);
    expect(summary).toEqual({
      cash_balance: 9000,
      positions_value: 400,
      total_value: 9400,
      total_pnl: -600,
      total_pnl_percent: -6,
      unrealized_pnl: 80
    });

    const zeroSafeSummary = calculatePortfolioSummary(9000, [
      { current_value: 0 as number, total_cost: 0 as number }
    ]);
    expect(zeroSafeSummary.positions_value).toBe(0);
    expect(zeroSafeSummary.unrealized_pnl).toBe(0);
  });
});

describe('utils/security', () => {
  it('compares strings in constant time style semantics', () => {
    expect(constantTimeCompare('abc', 'abc')).toBe(true);
    expect(constantTimeCompare('abc', 'abd')).toBe(false);
    expect(constantTimeCompare('abc', 'ab')).toBe(false);
  });

  it('verifies cron/admin credentials through wrappers', () => {
    expect(verifyCronSecret('s1', 's1')).toBe(true);
    expect(verifyCronSecret('s1', 's2')).toBe(false);
    expect(verifyAdminPassword('p1', 'p1')).toBe(true);
    expect(verifyAdminPassword('p1', 'p2')).toBe(false);
  });

  it('returns safe error messages based on environment', () => {
    try {
      vi.stubEnv('NODE_ENV', 'production');
      expect(safeErrorMessage(new Error('secret detail'))).toBe('An internal error occurred');

      vi.stubEnv('NODE_ENV', 'development');
      expect(safeErrorMessage(new Error('debug detail'))).toBe('debug detail');
      expect(safeErrorMessage('raw detail')).toBe('raw detail');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('parses integer params with defaults and max bounds', () => {
    expect(parseIntParam(null, 5)).toBe(5);
    expect(parseIntParam('foo', 5)).toBe(5);
    expect(parseIntParam('-1', 5)).toBe(5);
    expect(parseIntParam('10', 5)).toBe(10);
    expect(parseIntParam('10', 5, 7)).toBe(7);
  });
});
