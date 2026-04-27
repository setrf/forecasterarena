import { getDb } from '@/lib/db';
import {
  getAgentsWithModelsByCohort,
  getAverageBrierScore,
  getCohortById,
  getLatestSnapshot
} from '@/lib/db/queries';
import { calculateWeekNumber } from '@/lib/utils';
import { getPerformanceData, performanceDataToEquityCurves } from '@/lib/application/performance';
import {
  getAgentOpenPositionCount,
  getAgentTradeCount,
  getCohortMarketsWithPositionsCount,
  getCohortOpenPositionCount,
  getCohortTradeCount,
  getRecentCohortDecisions
} from '@/lib/application/cohorts/shared';
import { resolveAgentPortfolioSummary } from '@/lib/application/portfolio-summary';
import type { CohortDetailPayload, CohortNotFoundResult, OkResult } from '@/lib/application/cohorts/types';

export function getCohortDetail(
  cohortId: string
): OkResult<CohortDetailPayload> | CohortNotFoundResult {
  const cohort = getCohortById(cohortId);
  if (!cohort) {
    return { status: 'not_found', error: 'Cohort not found' };
  }

  const db = getDb();
  const rawAgents = getAgentsWithModelsByCohort(cohortId);

  const agents = rawAgents.map((agent) => {
    const portfolio = resolveAgentPortfolioSummary(agent.id, getLatestSnapshot(agent.id));

    return {
      id: agent.id,
      family_slug: agent.model.family_slug ?? agent.family_id ?? agent.model_id,
      family_id: agent.family_id,
      legacy_model_id: agent.model.legacy_model_id,
      release_id: agent.release_id,
      benchmark_config_model_id: agent.benchmark_config_model_id,
      model_display_name: agent.model.display_name,
      model_color: agent.model.color,
      model_release_name: agent.model.release_name,
      cash_balance: agent.cash_balance,
      total_invested: agent.total_invested,
      status: agent.status,
      total_value: portfolio.totalValue,
      total_pnl: portfolio.totalPnl,
      total_pnl_percent: portfolio.totalPnlPercent,
      brier_score: getAverageBrierScore(agent.id),
      position_count: getAgentOpenPositionCount(db, agent.id),
      trade_count: getAgentTradeCount(db, agent.id),
      num_resolved_bets: portfolio.numResolvedBets
    };
  }).sort((left, right) => right.total_value - left.total_value);

  const brierScores = agents
    .map((agent) => agent.brier_score)
    .filter((score): score is number => score !== null);
  const totalResolvedBets = agents.reduce((sum, agent) => sum + agent.num_resolved_bets, 0);

  const performance = getPerformanceData('ALL', { cohortId });
  const equityCurves = performanceDataToEquityCurves(performance.data);

  return {
    status: 'ok',
    data: {
      cohort: {
        ...cohort,
        benchmark_config_id: cohort.benchmark_config_id
      },
      agents,
      stats: {
        week_number: calculateWeekNumber(cohort.started_at),
        total_trades: getCohortTradeCount(db, cohortId),
        total_positions_open: getCohortOpenPositionCount(db, cohortId),
        markets_with_positions: getCohortMarketsWithPositionsCount(db, cohortId),
        total_resolved_bets: totalResolvedBets,
        avg_brier_score: brierScores.length > 0
          ? brierScores.reduce((sum, score) => sum + score, 0) / brierScores.length
          : null
      },
      equity_curves: equityCurves,
      release_changes: performance.release_changes,
      recent_decisions: getRecentCohortDecisions(db, cohortId),
      updated_at: new Date().toISOString()
    }
  };
}
