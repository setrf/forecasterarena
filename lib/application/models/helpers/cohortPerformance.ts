import { INITIAL_BALANCE } from '@/lib/constants';
import {
  calculateActualPortfolioValue,
  getAverageBrierScore,
  getSnapshotsByAgent
} from '@/lib/db/queries';
import type { AgentWithCohort, ModelDetailPayload } from '@/lib/application/models/types';

type CohortPerformance = ModelDetailPayload['cohort_performance'][number];

export function buildCohortPerformance(
  agents: AgentWithCohort[]
): CohortPerformance[] {
  return agents.map((agent) => {
    const snapshots = getSnapshotsByAgent(agent.id);
    const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const brierScore = getAverageBrierScore(agent.id);
    const totalValue = latestSnapshot?.total_value ?? calculateActualPortfolioValue(agent.id);
    const totalPnl = latestSnapshot?.total_pnl ?? (totalValue - INITIAL_BALANCE);
    const totalPnlPercent = latestSnapshot?.total_pnl_percent ?? ((totalPnl / INITIAL_BALANCE) * 100);

    return {
      cohort_id: agent.cohort_id,
      cohort_number: agent.cohort_number,
      cohort_status: agent.cohort_status,
      agent_status: agent.status,
      cash_balance: agent.cash_balance,
      total_value: totalValue,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent,
      brier_score: brierScore,
      num_resolved_bets: latestSnapshot?.num_resolved_bets ?? 0
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
