import { DECISION_COHORT_LIMIT } from '@/lib/constants';

export type CohortDecisionStatus = 'decisioning' | 'tracking_only' | 'completed';

export interface CohortDecisionState {
  decision_eligible: boolean;
  decision_status: CohortDecisionStatus;
}

interface CohortDecisionStateInput {
  cohort_number: number;
  status: string;
}

export function getDecisionEligibilityThreshold(
  latestCohortNumber: number,
  limit: number = DECISION_COHORT_LIMIT
): number {
  return Math.max(1, latestCohortNumber - limit + 1);
}

export function getCohortDecisionState(
  cohort: CohortDecisionStateInput,
  latestCohortNumber: number,
  limit: number = DECISION_COHORT_LIMIT
): CohortDecisionState {
  if (cohort.status === 'completed') {
    return {
      decision_eligible: false,
      decision_status: 'completed'
    };
  }

  const threshold = getDecisionEligibilityThreshold(latestCohortNumber, limit);
  const decisionEligible = cohort.status === 'active' && cohort.cohort_number >= threshold;

  return {
    decision_eligible: decisionEligible,
    decision_status: decisionEligible ? 'decisioning' : 'tracking_only'
  };
}
