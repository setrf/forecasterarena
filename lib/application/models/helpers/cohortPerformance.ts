import {
  getAverageBrierScore,
  getBrierScoresByAgent,
  getLatestSnapshot
} from '@/lib/db/queries';
import {
  getCohortScoringStatus,
  isCohortArchived
} from '@/lib/cohort-decision-state';
import { resolveAgentPortfolioSummary } from '@/lib/application/portfolio-summary';
import type { AgentWithCohort, ModelDetailPayload } from '@/lib/application/models/types';

type CohortPerformance = ModelDetailPayload['cohort_performance'][number];

export function buildCohortPerformance(
  agents: AgentWithCohort[]
): CohortPerformance[] {
  return agents.map((agent) => {
    const archived = isCohortArchived(agent);
    const latestSnapshot = archived ? null : getLatestSnapshot(agent.id);
    const brierScore = getAverageBrierScore(agent.id);
    const brierScores = archived ? getBrierScoresByAgent(agent.id) : [];
    const portfolio = resolveAgentPortfolioSummary(agent.id, latestSnapshot);

    return {
      cohort_id: agent.cohort_id,
      cohort_number: agent.cohort_number,
      cohort_status: agent.cohort_status,
      methodology_version: agent.methodology_version,
      is_archived: archived,
      archived_at: agent.archived_at,
      archive_reason: agent.archive_reason,
      scoring_status: getCohortScoringStatus(agent),
      agent_status: agent.status,
      cash_balance: agent.cash_balance,
      total_value: portfolio.totalValue,
      total_pnl: portfolio.totalPnl,
      total_pnl_percent: portfolio.totalPnlPercent,
      brier_score: brierScore,
      num_resolved_bets: archived ? brierScores.length : portfolio.numResolvedBets
    };
  });
}

export function calculateAverageBrierScore(
  cohortPerformance: CohortPerformance[]
): number | null {
  const brierScores = cohortPerformance
    .map((cohort) => cohort.brier_score)
    .filter((score): score is number => score !== null);

  return brierScores.length > 0
    ? brierScores.reduce((sum, score) => sum + score, 0) / brierScores.length
    : null;
}
