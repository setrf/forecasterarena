/**
 * Benchmark scheduling configuration.
 */
export const DECISION_DAY = 0;
export const DECISION_HOUR_UTC = 0;
export const METHODOLOGY_VERSION = 'v2';
export const DEFAULT_DECISION_COHORT_LIMIT = 5;

export function parseDecisionCohortLimit(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_DECISION_COHORT_LIMIT;
  }

  return parsed;
}

export const DECISION_COHORT_LIMIT = parseDecisionCohortLimit(process.env.DECISION_COHORT_LIMIT);
