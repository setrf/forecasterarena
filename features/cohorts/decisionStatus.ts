export type CohortDecisionStatus = 'decisioning' | 'tracking_only' | 'completed';
export type CohortScoringStatus = 'current' | 'archived';

export function getCohortDecisionStatusLabel(status: CohortDecisionStatus): string {
  switch (status) {
    case 'decisioning':
      return 'Decisioning';
    case 'tracking_only':
      return 'Resolving';
    case 'completed':
      return 'Completed';
  }
}

export function getCohortDecisionStatusBadge(status: CohortDecisionStatus): string {
  switch (status) {
    case 'decisioning':
      return 'badge-active';
    case 'tracking_only':
      return 'badge-pending';
    case 'completed':
      return 'badge-completed';
  }
}

export function getCohortScoringStatusLabel(status: CohortScoringStatus): string {
  return status === 'archived' ? 'Archived v1' : 'Current';
}

export function getCohortScoringStatusBadge(status: CohortScoringStatus): string {
  return status === 'archived' ? 'badge-archived' : 'badge-active';
}
