import { describe, expect, it } from 'vitest';
import { DEFAULT_DECISION_COHORT_LIMIT, parseDecisionCohortLimit } from '@/lib/constants/scheduling';

describe('decision cohort scheduling config', () => {
  it('uses a safe default for missing or invalid limits', () => {
    expect(parseDecisionCohortLimit(undefined)).toBe(DEFAULT_DECISION_COHORT_LIMIT);
    expect(parseDecisionCohortLimit('')).toBe(DEFAULT_DECISION_COHORT_LIMIT);
    expect(parseDecisionCohortLimit('0')).toBe(DEFAULT_DECISION_COHORT_LIMIT);
    expect(parseDecisionCohortLimit('-2')).toBe(DEFAULT_DECISION_COHORT_LIMIT);
    expect(parseDecisionCohortLimit('2.5')).toBe(DEFAULT_DECISION_COHORT_LIMIT);
    expect(parseDecisionCohortLimit('abc')).toBe(DEFAULT_DECISION_COHORT_LIMIT);
  });

  it('accepts positive integer limits', () => {
    expect(parseDecisionCohortLimit('1')).toBe(1);
    expect(parseDecisionCohortLimit('5')).toBe(5);
  });
});
