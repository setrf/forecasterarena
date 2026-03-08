import { INITIAL_BALANCE } from '@/lib/constants';
import { getDb } from '@/lib/db';
import {
  calculateActualPortfolioValue,
  getAgentsWithModelsByCohort,
  getAverageBrierScore,
  getCohortById,
  getLatestSnapshot,
  getSnapshotsByAgent
} from '@/lib/db/queries';
import { calculateWeekNumber } from '@/lib/utils';
import {
  getAgentOpenPositionCount,
  getAgentTradeCount,
  getCohortMarketsWithPositionsCount,
  getCohortOpenPositionCount,
  getCohortTradeCount,
  getRecentCohortDecisions
} from '@/lib/application/cohorts/shared';
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
    const snapshot = getLatestSnapshot(agent.id);
    const totalValue = snapshot?.total_value ?? calculateActualPortfolioValue(agent.id);
    const totalPnl = snapshot?.total_pnl ?? (totalValue - INITIAL_BALANCE);
    const totalPnlPercent = snapshot?.total_pnl_percent ?? ((totalPnl / INITIAL_BALANCE) * 100);

    return {
      id: agent.id,
      model_id: agent.model_id,
      model_slug: agent.model.family_slug,
      family_id: agent.family_id,
      release_id: agent.release_id,
      model_display_name: agent.model.display_name,
      model_color: agent.model.color,
      model_release_name: agent.model.release_name,
      cash_balance: agent.cash_balance,
      total_invested: agent.total_invested,
      status: agent.status,
      total_value: totalValue,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent,
      brier_score: getAverageBrierScore(agent.id),
      position_count: getAgentOpenPositionCount(db, agent.id),
      trade_count: getAgentTradeCount(db, agent.id),
      num_resolved_bets: snapshot?.num_resolved_bets ?? 0
    };
  }).sort((left, right) => right.total_value - left.total_value);

  const brierScores = agents
    .map((agent) => agent.brier_score)
    .filter((score): score is number => score !== null);

  const equityCurves = Object.fromEntries(
    rawAgents.map((agent) => [
      agent.model.legacy_model_id ?? agent.model.family_slug ?? agent.family_id ?? agent.model_id,
      getSnapshotsByAgent(agent.id).map((snapshot) => ({
        date: snapshot.snapshot_timestamp,
        value: snapshot.total_value
      }))
    ])
  );

  return {
    status: 'ok',
    data: {
      cohort,
      agents,
      stats: {
        week_number: calculateWeekNumber(cohort.started_at),
        total_trades: getCohortTradeCount(db, cohortId),
        total_positions_open: getCohortOpenPositionCount(db, cohortId),
        markets_with_positions: getCohortMarketsWithPositionsCount(db, cohortId),
        avg_brier_score: brierScores.length > 0
          ? brierScores.reduce((sum, score) => sum + score, 0) / brierScores.length
          : null
      },
      equity_curves: equityCurves,
      recent_decisions: getRecentCohortDecisions(db, cohortId),
      updated_at: new Date().toISOString()
    }
  };
}
