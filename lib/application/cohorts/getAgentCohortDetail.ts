import { INITIAL_BALANCE } from '@/lib/constants';
import { getDb } from '@/lib/db';
import {
  calculateActualPortfolioValue,
  getAverageBrierScore,
  getClosedPositionsWithMarkets,
  getCohortById,
  getAgentsWithModelsByCohort,
  getPositionsWithMarkets,
  resolveModelFamily,
  getSnapshotsByAgent
} from '@/lib/db/queries';
import {
  getAgentDecisionsWithMarkets,
  getAgentOpenPositionCount,
  getAgentRank,
  getAgentTradeCount,
  getAgentTrades,
  getAgentWinRate,
  getCohortMarketCount,
  getCohortPnlStats,
  getCohortWeek
} from '@/lib/application/cohorts/shared';
import type {
  AgentCohortDetailPayload,
  AgentCohortNotFoundResult,
  OkResult
} from '@/lib/application/cohorts/types';

export function getAgentCohortDetail(
  cohortId: string,
  familySlugOrLegacyId: string
): OkResult<AgentCohortDetailPayload> | AgentCohortNotFoundResult {
  const cohort = getCohortById(cohortId);
  if (!cohort) {
    return { status: 'not_found', error: 'Cohort not found' };
  }

  const family = resolveModelFamily(familySlugOrLegacyId);
  if (!family) {
    return { status: 'not_found', error: 'Model not found' };
  }

  const agentWithModel = getAgentsWithModelsByCohort(cohortId).find((candidate) => (
    candidate.family_id === family.id ||
    candidate.model_id === familySlugOrLegacyId ||
    candidate.model.family_slug === familySlugOrLegacyId
  ));

  const agent = agentWithModel;
  if (!agent) {
    return { status: 'not_found', error: 'Agent not found in this cohort' };
  }

  const db = getDb();
  const snapshots = getSnapshotsByAgent(agent.id);
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const totalValue = latestSnapshot?.total_value ?? calculateActualPortfolioValue(agent.id);
  const totalPnl = latestSnapshot?.total_pnl ?? (totalValue - INITIAL_BALANCE);
  const totalPnlPercent = latestSnapshot?.total_pnl_percent ?? ((totalPnl / INITIAL_BALANCE) * 100);
  const rankResult = getAgentRank(db, cohortId, totalValue);
  const winRateResult = getAgentWinRate(db, agent.id);
  const cohortStats = getCohortPnlStats(db, cohortId);

  return {
    status: 'ok',
    data: {
      cohort: {
        id: cohort.id,
        cohort_number: cohort.cohort_number,
        status: cohort.status,
        started_at: cohort.started_at,
        completed_at: cohort.completed_at,
        benchmark_config_id: cohort.benchmark_config_id,
        current_week: getCohortWeek(db, cohortId),
        total_markets: getCohortMarketCount(db, cohortId)
      },
      model: {
        id: family.slug ?? family.id,
        family_id: family.id,
        slug: family.slug,
        legacy_model_id: family.legacy_model_id,
        display_name: agent.model.family_display_name,
        provider: agent.model.provider,
        color: agent.model.color,
        release_id: agent.model.release_id,
        release_name: agent.model.release_name,
        benchmark_config_model_id: agent.benchmark_config_model_id
      },
      agent: {
        id: agent.id,
        model_id: agent.model.family_slug ?? agent.family_id ?? agent.model_id,
        legacy_model_id: agent.model.legacy_model_id,
        benchmark_config_model_id: agent.benchmark_config_model_id,
        status: agent.status,
        cash_balance: agent.cash_balance,
        total_invested: agent.total_invested,
        total_value: totalValue,
        total_pnl: totalPnl,
        total_pnl_percent: totalPnlPercent,
        brier_score: getAverageBrierScore(agent.id),
        num_resolved_bets: latestSnapshot?.num_resolved_bets ?? 0,
        rank: rankResult.rank,
        total_agents: rankResult.total_agents
      },
      stats: {
        position_count: getAgentOpenPositionCount(db, agent.id),
        trade_count: getAgentTradeCount(db, agent.id),
        win_rate: winRateResult && winRateResult.total > 0
          ? winRateResult.wins / winRateResult.total
          : null,
        cohort_avg_pnl_percent: cohortStats?.avg_pnl_percent ?? 0,
        cohort_best_pnl_percent: cohortStats?.best_pnl_percent ?? 0,
        cohort_worst_pnl_percent: cohortStats?.worst_pnl_percent ?? 0
      },
      equity_curve: snapshots.map((snapshot) => ({
        date: snapshot.snapshot_timestamp,
        value: snapshot.total_value
      })),
      decisions: getAgentDecisionsWithMarkets(db, agent.id),
      positions: getPositionsWithMarkets(agent.id),
      closed_positions: getClosedPositionsWithMarkets(agent.id),
      trades: getAgentTrades(db, agent.id),
      updated_at: new Date().toISOString()
    }
  };
}
