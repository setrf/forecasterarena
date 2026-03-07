import { INITIAL_BALANCE } from '@/lib/constants';
import { getDb } from '@/lib/db';
import { getModelById } from '@/lib/db/queries';
import {
  buildCohortPerformance,
  buildEquityCurve,
  calculateAverageBrierScore
} from '@/lib/application/models/helpers';
import {
  getAgentsWithCohorts,
  getModelEquitySnapshots,
  getModelWinRate,
  getRecentModelDecisions
} from '@/lib/application/models/queries';
import type {
  ModelDetailNotFoundResult,
  ModelDetailPayload,
  OkResult
} from '@/lib/application/models/types';

export function getModelDetail(
  modelId: string
): OkResult<ModelDetailPayload> | ModelDetailNotFoundResult {
  const model = getModelById(modelId);

  if (!model) {
    return { status: 'not_found', error: 'Model not found' };
  }

  const db = getDb();
  const agents = getAgentsWithCohorts(db, modelId);
  const cohortPerformance = buildCohortPerformance(agents);
  const totalPnl = cohortPerformance.reduce((sum, cohort) => sum + cohort.total_pnl, 0);
  const totalCapital = cohortPerformance.length * INITIAL_BALANCE;
  const winRateResult = getModelWinRate(db, modelId);

  return {
    status: 'ok',
    data: {
      model,
      num_cohorts: agents.length,
      total_pnl: totalPnl,
      avg_pnl_percent: totalCapital > 0 ? (totalPnl / totalCapital) * 100 : 0,
      avg_brier_score: calculateAverageBrierScore(cohortPerformance),
      win_rate: winRateResult && winRateResult.total > 0
        ? winRateResult.wins / winRateResult.total
        : null,
      cohort_performance: cohortPerformance,
      recent_decisions: getRecentModelDecisions(db, modelId),
      equity_curve: buildEquityCurve(getModelEquitySnapshots(db, modelId)),
      updated_at: new Date().toISOString()
    }
  };
}
