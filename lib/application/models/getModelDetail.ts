import { INITIAL_BALANCE } from '@/lib/constants';
import { getModelById } from '@/lib/db/queries';
import { buildCohortPerformance } from '@/lib/application/models/cohortPerformance';
import {
  getAgentsForModel,
  getModelEquityCurve,
  getModelWinRate,
  getRecentModelDecisions
} from '@/lib/application/models/queries';
import type {
  ModelDetailPayload,
  NotFoundResult,
  OkResult
} from '@/lib/application/models/types';

export function getModelDetail(
  modelId: string
): OkResult<ModelDetailPayload> | NotFoundResult {
  const model = getModelById(modelId);

  if (!model) {
    return { status: 'not_found', error: 'Model not found' };
  }

  const agents = getAgentsForModel(modelId);
  const cohortPerformance = buildCohortPerformance(agents);

  const totalPnl = cohortPerformance.reduce((sum, cohort) => sum + cohort.total_pnl, 0);
  const totalCapital = cohortPerformance.length * INITIAL_BALANCE;
  const avgPnlPercent = totalCapital > 0 ? (totalPnl / totalCapital) * 100 : 0;

  const brierScores = cohortPerformance
    .map((cohort) => cohort.brier_score)
    .filter((score): score is number => score !== null);
  const avgBrierScore = brierScores.length > 0
    ? brierScores.reduce((sum, score) => sum + score, 0) / brierScores.length
    : null;

  return {
    status: 'ok',
    data: {
      model,
      num_cohorts: agents.length,
      total_pnl: totalPnl,
      avg_pnl_percent: avgPnlPercent,
      avg_brier_score: avgBrierScore,
      win_rate: getModelWinRate(modelId),
      cohort_performance: cohortPerformance,
      recent_decisions: getRecentModelDecisions(modelId),
      equity_curve: getModelEquityCurve(modelId),
      updated_at: new Date().toISOString()
    }
  };
}
