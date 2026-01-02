/**
 * Agent-Cohort Detail API Endpoint
 *
 * Returns detailed performance data for a specific model within a specific cohort.
 *
 * @route GET /api/cohorts/[cohortId]/models/[modelId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  getCohortById,
  getModelById,
  getAgentByCohortAndModel,
  getSnapshotsByAgent,
  getDecisionsByAgent,
  getPositionsWithMarkets,
  getClosedPositionsWithMarkets,
  getTradesByAgent,
  getAverageBrierScore,
  calculateActualPortfolioValue
} from '@/lib/db/queries';
import { INITIAL_BALANCE } from '@/lib/constants';
import { safeErrorMessage } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  try {
    const { id: cohortId, modelId } = await params;

    // Validate cohort exists
    const cohort = getCohortById(cohortId);
    if (!cohort) {
      return NextResponse.json(
        { error: 'Cohort not found' },
        { status: 404 }
      );
    }

    // Validate model exists
    const model = getModelById(modelId);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Get agent for this cohort + model combination
    const agent = getAgentByCohortAndModel(cohortId, modelId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found in this cohort' },
        { status: 404 }
      );
    }

    const db = getDb();

    // Get cohort context
    const cohortWeek = db.prepare(`
      SELECT
        CAST((julianday('now') - julianday(started_at)) / 7 AS INTEGER) + 1 as week_number
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

    // Get agent's portfolio snapshots
    const snapshots = getSnapshotsByAgent(agent.id);
    const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    // Calculate current portfolio value
    const totalValue = latestSnapshot?.total_value || calculateActualPortfolioValue(agent.id);
    const totalPnl = latestSnapshot?.total_pnl || (totalValue - INITIAL_BALANCE);
    const totalPnlPercent = latestSnapshot?.total_pnl_percent || ((totalPnl / INITIAL_BALANCE) * 100);

    // Get agent's rank in cohort
    const rankResult = db.prepare(`
      SELECT
        COUNT(*) + 1 as rank,
        (SELECT COUNT(*) FROM agents WHERE cohort_id = ?) as total_agents
      FROM agents a1
      LEFT JOIN portfolio_snapshots ps1 ON a1.id = ps1.agent_id AND ps1.snapshot_timestamp = (
        SELECT MAX(snapshot_timestamp) FROM portfolio_snapshots WHERE agent_id = a1.id
      )
      LEFT JOIN (
        SELECT agent_id, COALESCE(SUM(current_value), 0) as total_position_value
        FROM positions
        WHERE status = 'open'
        GROUP BY agent_id
      ) p1 ON a1.id = p1.agent_id
      WHERE a1.cohort_id = ?
        AND COALESCE(ps1.total_value, a1.cash_balance + COALESCE(p1.total_position_value, 0)) > ?
    `).get(cohortId, cohortId, totalValue) as { rank: number; total_agents: number };

    // Get Brier score
    const brierScore = getAverageBrierScore(agent.id);

    // Get win rate
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

    const winRate = winRateResult && winRateResult.total > 0
      ? winRateResult.wins / winRateResult.total
      : null;

    // Get cohort comparison stats
    const cohortStats = db.prepare(`
      SELECT
        AVG(COALESCE(ps.total_pnl_percent, 0)) as avg_pnl_percent,
        MAX(COALESCE(ps.total_pnl_percent, 0)) as best_pnl_percent,
        MIN(COALESCE(ps.total_pnl_percent, 0)) as worst_pnl_percent
      FROM agents a
      LEFT JOIN (
        SELECT agent_id, total_pnl_percent
        FROM portfolio_snapshots
        WHERE (agent_id, snapshot_timestamp) IN (
          SELECT agent_id, MAX(snapshot_timestamp)
          FROM portfolio_snapshots
          GROUP BY agent_id
        )
      ) ps ON a.id = ps.agent_id
      WHERE a.cohort_id = ?
    `).get(cohortId) as {
      avg_pnl_percent: number;
      best_pnl_percent: number;
      worst_pnl_percent: number;
    } | undefined;

    // Get position count (only active markets)
    const positionCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM positions p
      JOIN markets m ON p.market_id = m.id
      WHERE p.agent_id = ?
        AND p.status = 'open'
        AND m.status = 'active'
    `).get(agent.id) as { count: number };

    // Get trade count
    const tradeCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM trades
      WHERE agent_id = ?
    `).get(agent.id) as { count: number };

    // Get equity curve (portfolio snapshots for this agent in this cohort)
    const equityCurve = snapshots.map(s => ({
      date: s.snapshot_timestamp,
      value: s.total_value
    }));

    // Get decisions for this agent (with market details)
    const decisions = db.prepare(`
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
    `).all(agent.id);

    // For each decision that resulted in trades, get the markets traded
    const decisionsWithMarkets = decisions.map((decision: any) => {
      const trades = db.prepare(`
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
      `).all(decision.id);

      return {
        ...decision,
        markets: trades
      };
    });

    // Get open positions with market info (only active markets)
    const positions = getPositionsWithMarkets(agent.id);

    // Get closed positions with outcomes (settled, exited, or pending resolution)
    const closedPositions = getClosedPositionsWithMarkets(agent.id);

    // Get trade history with market info
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
    `).all(agent.id);

    return NextResponse.json({
      cohort: {
        id: cohort.id,
        cohort_number: cohort.cohort_number,
        status: cohort.status,
        started_at: cohort.started_at,
        completed_at: cohort.completed_at,
        current_week: cohortWeek?.week_number || 1,
        total_markets: cohortMarkets?.count || 0
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
        brier_score: brierScore,
        num_resolved_bets: latestSnapshot?.num_resolved_bets || 0,
        rank: rankResult.rank,
        total_agents: rankResult.total_agents
      },
      stats: {
        position_count: positionCount.count,
        trade_count: tradeCount.count,
        win_rate: winRate,
        cohort_avg_pnl_percent: cohortStats?.avg_pnl_percent || 0,
        cohort_best_pnl_percent: cohortStats?.best_pnl_percent || 0,
        cohort_worst_pnl_percent: cohortStats?.worst_pnl_percent || 0
      },
      equity_curve: equityCurve,
      decisions: decisionsWithMarkets,
      positions: positions,
      closed_positions: closedPositions,
      trades: trades,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in agent-cohort detail API:', error);

    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
