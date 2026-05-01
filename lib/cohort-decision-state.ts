import { DECISION_COHORT_LIMIT } from '@/lib/constants';

export type CohortDecisionStatus = 'decisioning' | 'tracking_only' | 'completed';
export type CohortScoringStatus = 'current' | 'archived';

export interface CohortDecisionState {
  decision_eligible: boolean;
  decision_status: CohortDecisionStatus;
}

interface CohortDecisionStateInput {
  cohort_number: number;
  status: string;
  is_archived?: boolean | number | null;
}

interface CohortScoringStateInput {
  is_archived?: boolean | number | null;
}

export function isCohortArchived(cohort: CohortScoringStateInput): boolean {
  return cohort.is_archived === true || cohort.is_archived === 1;
}

export function getCohortScoringStatus(cohort: CohortScoringStateInput): CohortScoringStatus {
  return isCohortArchived(cohort) ? 'archived' : 'current';
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

  if (isCohortArchived(cohort)) {
    return {
      decision_eligible: false,
      decision_status: 'tracking_only'
    };
  }

  const threshold = getDecisionEligibilityThreshold(latestCohortNumber, limit);
  const decisionEligible = cohort.status === 'active' && cohort.cohort_number >= threshold;

  return {
    decision_eligible: decisionEligible,
    decision_status: decisionEligible ? 'decisioning' : 'tracking_only'
  };
}
