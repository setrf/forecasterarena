import { INITIAL_BALANCE } from '@/lib/constants';
import { getDb } from '@/lib/db';
import {
  calculateActualPortfolioValue,
  getAgentByCohortAndModel,
  getAgentsWithModelsByCohort,
  getAverageBrierScore,
  getClosedPositionsWithMarkets,
  getCohortById,
  getModelById,
  getLatestSnapshot,
  getPositionsWithMarkets,
  getSnapshotsByAgent
} from '@/lib/db/queries';
import { calculateWeekNumber } from '@/lib/utils';

export interface CohortDetailPayload {
  cohort: ReturnType<typeof getCohortById>;
  agents: Array<{
    id: string;
    model_id: string;
    model_display_name: string;
    model_color: string | null;
    cash_balance: number;
    total_invested: number;
    status: string;
    total_value: number;
    total_pnl: number;
    total_pnl_percent: number;
    brier_score: number | null;
    position_count: number;
    trade_count: number;
    num_resolved_bets: number;
  }>;
  stats: {
    week_number: number;
    total_trades: number;
    total_positions_open: number;
    markets_with_positions: number;
    avg_brier_score: number | null;
  };
  equity_curves: Record<string, Array<{ date: string; value: number }>>;
  recent_decisions: Array<Record<string, unknown>>;
  updated_at: string;
}

export interface AgentCohortDetailPayload {
  cohort: {
    id: string;
    cohort_number: number;
    status: string;
    started_at: string;
    completed_at: string | null;
    current_week: number;
    total_markets: number;
  };
  model: {
    id: string;
    display_name: string;
    provider: string;
    color: string | null;
  };
  agent: {
    id: string;
    status: string;
    cash_balance: number;
    total_invested: number;
    total_value: number;
    total_pnl: number;
    total_pnl_percent: number;
    brier_score: number | null;
    num_resolved_bets: number;
    rank: number;
    total_agents: number;
  };
  stats: {
    position_count: number;
    trade_count: number;
    win_rate: number | null;
    cohort_avg_pnl_percent: number;
    cohort_best_pnl_percent: number;
    cohort_worst_pnl_percent: number;
  };
  equity_curve: Array<{ date: string; value: number }>;
  decisions: Array<Record<string, unknown>>;
  positions: ReturnType<typeof getPositionsWithMarkets>;
  closed_positions: ReturnType<typeof getClosedPositionsWithMarkets>;
  trades: Array<Record<string, unknown>>;
  updated_at: string;
}

type NotFoundResult =
  | { status: 'not_found'; error: 'Cohort not found' }
  | { status: 'not_found'; error: 'Model not found' }
  | { status: 'not_found'; error: 'Agent not found in this cohort' };

type OkResult<T> = {
  status: 'ok';
  data: T;
};

export function getCohortDetail(
  cohortId: string
): OkResult<CohortDetailPayload> | Extract<NotFoundResult, { error: 'Cohort not found' }> {
  const cohort = getCohortById(cohortId);

  if (!cohort) {
    return { status: 'not_found', error: 'Cohort not found' };
  }

  const db = getDb();
  const rawAgents = getAgentsWithModelsByCohort(cohortId);

  const agents = rawAgents.map((agent) => {
    const snapshot = getLatestSnapshot(agent.id);
    const brierScore = getAverageBrierScore(agent.id);

    const positionCount = (db.prepare(`
      SELECT COUNT(*) as count
      FROM positions p
      JOIN markets m ON p.market_id = m.id
      WHERE p.agent_id = ?
        AND p.status = 'open'
        AND m.status = 'active'
    `).get(agent.id) as { count: number }).count;

    const tradeCount = (db.prepare(`
      SELECT COUNT(*) as count FROM trades WHERE agent_id = ?
    `).get(agent.id) as { count: number }).count;

    const totalValue = snapshot?.total_value ?? calculateActualPortfolioValue(agent.id);
    const totalPnl = snapshot?.total_pnl ?? (totalValue - INITIAL_BALANCE);
    const totalPnlPercent = snapshot?.total_pnl_percent ?? ((totalPnl / INITIAL_BALANCE) * 100);

    return {
      id: agent.id,
      model_id: agent.model_id,
      model_display_name: agent.model.display_name,
      model_color: agent.model.color,
      cash_balance: agent.cash_balance,
      total_invested: agent.total_invested,
      status: agent.status,
      total_value: totalValue,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent,
      brier_score: brierScore,
      position_count: positionCount,
      trade_count: tradeCount,
      num_resolved_bets: snapshot?.num_resolved_bets ?? 0
    };
  });

  agents.sort((a, b) => b.total_value - a.total_value);

  const totalTrades = (db.prepare(`
    SELECT COUNT(*) as count
    FROM trades t
    JOIN agents a ON t.agent_id = a.id
    WHERE a.cohort_id = ?
  `).get(cohortId) as { count: number }).count;

  const totalPositionsOpen = (db.prepare(`
    SELECT COUNT(*) as count
    FROM positions p
    JOIN agents a ON p.agent_id = a.id
    WHERE a.cohort_id = ? AND p.status = 'open'
  `).get(cohortId) as { count: number }).count;

  const marketsWithPositions = (db.prepare(`
    SELECT COUNT(DISTINCT p.market_id) as count
    FROM positions p
    JOIN agents a ON p.agent_id = a.id
    WHERE a.cohort_id = ?
  `).get(cohortId) as { count: number }).count;

  const brierScores = agents
    .map((agent) => agent.brier_score)
    .filter((score): score is number => score !== null);

  const equityCurves: Record<string, Array<{ date: string; value: number }>> = {};
  for (const agent of rawAgents) {
    equityCurves[agent.model_id] = getSnapshotsByAgent(agent.id).map((snapshot) => ({
      date: snapshot.snapshot_timestamp,
      value: snapshot.total_value
    }));
  }

  const recentDecisions = db.prepare(`
    SELECT
      d.*,
      m.display_name as model_display_name,
      m.color as model_color
    FROM decisions d
    JOIN agents a ON d.agent_id = a.id
    JOIN models m ON a.model_id = m.id
    WHERE d.cohort_id = ?
    ORDER BY d.decision_timestamp DESC
    LIMIT 20
  `).all(cohortId) as Array<Record<string, unknown>>;

  return {
    status: 'ok',
    data: {
      cohort,
      agents,
      stats: {
        week_number: calculateWeekNumber(cohort.started_at),
        total_trades: totalTrades,
        total_positions_open: totalPositionsOpen,
        markets_with_positions: marketsWithPositions,
        avg_brier_score: brierScores.length > 0
          ? brierScores.reduce((sum, score) => sum + score, 0) / brierScores.length
          : null
      },
      equity_curves: equityCurves,
      recent_decisions: recentDecisions,
      updated_at: new Date().toISOString()
    }
  };
}

export function getAgentCohortDetail(
  cohortId: string,
  modelId: string
): OkResult<AgentCohortDetailPayload> | NotFoundResult {
  const cohort = getCohortById(cohortId);
  if (!cohort) {
    return { status: 'not_found', error: 'Cohort not found' };
  }

  const model = getModelById(modelId);
  if (!model) {
    return { status: 'not_found', error: 'Model not found' };
  }

  const agent = getAgentByCohortAndModel(cohortId, modelId);
  if (!agent) {
    return { status: 'not_found', error: 'Agent not found in this cohort' };
  }

  const db = getDb();

  const cohortWeek = db.prepare(`
    SELECT CAST((julianday('now') - julianday(started_at)) / 7 AS INTEGER) + 1 as week_number
    FROM cohorts
    WHERE id = ?
  `).get(cohortId) as { week_number: number } | undefined;

  const cohortMarkets = db.prepare(`
    SELECT COUNT(DISTINCT market_id) as count
    FROM positions
    WHERE agent_id IN (
      SELECT id FROM agents WHERE cohort_id = ?
    )
  `).get(cohortId) as { count: number } | undefined;

  const snapshots = getSnapshotsByAgent(agent.id);
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const totalValue = latestSnapshot?.total_value ?? calculateActualPortfolioValue(agent.id);
  const totalPnl = latestSnapshot?.total_pnl ?? (totalValue - INITIAL_BALANCE);
  const totalPnlPercent = latestSnapshot?.total_pnl_percent ?? ((totalPnl / INITIAL_BALANCE) * 100);

  const rankResult = db.prepare(`
    SELECT
      COUNT(*) + 1 as rank,
      (SELECT COUNT(*) FROM agents WHERE cohort_id = ?) as total_agents
    FROM agents a1
    LEFT JOIN portfolio_snapshots ps1 ON a1.id = ps1.agent_id AND ps1.snapshot_timestamp = (
      SELECT MAX(snapshot_timestamp) FROM portfolio_snapshots WHERE agent_id = a1.id
    )
    LEFT JOIN (
      SELECT agent_id, COALESCE(SUM(COALESCE(current_value, total_cost)), 0) as total_position_value
      FROM positions
      WHERE status = 'open'
      GROUP BY agent_id
    ) p1 ON a1.id = p1.agent_id
    WHERE a1.cohort_id = ?
      AND COALESCE(ps1.total_value, a1.cash_balance + COALESCE(p1.total_position_value, 0)) > ?
  `).get(cohortId, cohortId, totalValue) as { rank: number; total_agents: number };

  const winRateResult = db.prepare(`
    SELECT
      COUNT(CASE WHEN t.side = m.resolution_outcome THEN 1 END) as wins,
      COUNT(*) as total
    FROM trades t
    JOIN markets m ON t.market_id = m.id
    WHERE t.agent_id = ?
      AND m.status = 'resolved'
      AND t.trade_type = 'BUY'
  `).get(agent.id) as { wins: number; total: number } | undefined;

  const cohortStats = db.prepare(`
    WITH latest_snapshots AS (
      SELECT
        ps.agent_id,
        ps.total_pnl_percent,
        ROW_NUMBER() OVER (PARTITION BY ps.agent_id ORDER BY ps.snapshot_timestamp DESC) as rn
      FROM portfolio_snapshots ps
    ),
    open_position_values AS (
      SELECT
        p.agent_id,
        COALESCE(SUM(COALESCE(p.current_value, p.total_cost)), 0) as total_position_value
      FROM positions p
      WHERE p.status = 'open'
      GROUP BY p.agent_id
    ),
    current_agent_totals AS (
      SELECT
        a.id as agent_id,
        COALESCE(
          ls.total_pnl_percent,
          ((a.cash_balance + COALESCE(op.total_position_value, 0) - ?) / ?) * 100
        ) as total_pnl_percent
      FROM agents a
      LEFT JOIN latest_snapshots ls ON a.id = ls.agent_id AND ls.rn = 1
      LEFT JOIN open_position_values op ON a.id = op.agent_id
      WHERE a.cohort_id = ?
    )
    SELECT
      AVG(total_pnl_percent) as avg_pnl_percent,
      MAX(total_pnl_percent) as best_pnl_percent,
      MIN(total_pnl_percent) as worst_pnl_percent
    FROM current_agent_totals
  `).get(INITIAL_BALANCE, INITIAL_BALANCE, cohortId) as {
    avg_pnl_percent: number;
    best_pnl_percent: number;
    worst_pnl_percent: number;
  } | undefined;

  const positionCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM positions p
    JOIN markets m ON p.market_id = m.id
    WHERE p.agent_id = ?
      AND p.status = 'open'
      AND m.status = 'active'
  `).get(agent.id) as { count: number };

  const tradeCount = (db.prepare(`
    SELECT COUNT(*) as count
    FROM trades
    WHERE agent_id = ?
  `).get(agent.id) as { count: number }).count;

  const rawDecisions = db.prepare(`
    SELECT
      d.id,
      d.decision_week,
      d.decision_timestamp,
      d.action,
      d.reasoning
    FROM decisions d
    WHERE d.agent_id = ?
    ORDER BY d.decision_timestamp DESC
    LIMIT 20
  `).all(agent.id) as Array<{
    id: string;
    decision_week: number;
    decision_timestamp: string;
    action: string;
    reasoning: string | null;
  }>;

  const decisions = rawDecisions.map((decision) => ({
    ...decision,
    markets: db.prepare(`
      SELECT
        t.trade_type,
        t.side,
        t.shares,
        t.price,
        t.total_amount,
        m.id as market_id,
        m.question as market_question
      FROM trades t
      JOIN markets m ON t.market_id = m.id
      WHERE t.decision_id = ?
      ORDER BY t.executed_at ASC
    `).all(decision.id)
  }));

  const trades = db.prepare(`
    SELECT
      t.id,
      t.executed_at as timestamp,
      t.trade_type,
      t.side,
      t.shares,
      t.price,
      t.total_amount,
      t.decision_id,
      m.id as market_id,
      m.question as market_question,
      d.decision_week
    FROM trades t
    JOIN markets m ON t.market_id = m.id
    LEFT JOIN decisions d ON t.decision_id = d.id
    WHERE t.agent_id = ?
    ORDER BY t.executed_at DESC
    LIMIT 50
  `).all(agent.id) as Array<Record<string, unknown>>;

  return {
    status: 'ok',
    data: {
      cohort: {
        id: cohort.id,
        cohort_number: cohort.cohort_number,
        status: cohort.status,
        started_at: cohort.started_at,
        completed_at: cohort.completed_at,
        current_week: cohortWeek?.week_number ?? 1,
        total_markets: cohortMarkets?.count ?? 0
      },
      model: {
        id: model.id,
        display_name: model.display_name,
        provider: model.provider,
        color: model.color
      },
      agent: {
        id: agent.id,
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
        position_count: positionCount.count,
        trade_count: tradeCount,
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
      decisions,
      positions: getPositionsWithMarkets(agent.id),
      closed_positions: getClosedPositionsWithMarkets(agent.id),
      trades,
      updated_at: new Date().toISOString()
    }
  };
}
