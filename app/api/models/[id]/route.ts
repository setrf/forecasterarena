/**
 * Model Detail API Endpoint
 * 
 * Returns detailed performance data for a specific model.
 * 
 * @route GET /api/models/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { 
  getModelById, 
  getAverageBrierScore,
  getSnapshotsByAgent,
  getDecisionsByAgent,
  getTradesByAgent
} from '@/lib/db/queries';
import { INITIAL_BALANCE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const model = getModelById(id);
    
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }
    
    const db = getDb();
    
    // Get all agents for this model across cohorts
    const agents = db.prepare(`
      SELECT 
        a.*,
        c.cohort_number,
        c.started_at as cohort_started_at,
        c.status as cohort_status
      FROM agents a
      JOIN cohorts c ON a.cohort_id = c.id
      WHERE a.model_id = ?
      ORDER BY c.started_at DESC
    `).all(id) as Array<{
      id: string;
      cohort_id: string;
      model_id: string;
      cash_balance: number;
      total_invested: number;
      status: string;
      created_at: string;
      cohort_number: number;
      cohort_started_at: string;
      cohort_status: string;
    }>;
    
    // Get performance for each cohort
    const cohortPerformance = agents.map(agent => {
      const snapshots = getSnapshotsByAgent(agent.id);  // No limit - get all snapshots
      const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
      const brierScore = getAverageBrierScore(agent.id);

      // Calculate current values with proper fallbacks
      const totalValue = latestSnapshot?.total_value || agent.cash_balance + agent.total_invested;
      const totalPnl = latestSnapshot?.total_pnl || (totalValue - INITIAL_BALANCE);
      const totalPnlPercent = latestSnapshot?.total_pnl_percent || ((totalPnl / INITIAL_BALANCE) * 100);

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
        num_resolved_bets: latestSnapshot?.num_resolved_bets || 0
      };
    });
    
    // Get aggregate stats
    const totalPnl = cohortPerformance.reduce((sum, c) => sum + c.total_pnl, 0);
    const avgPnlPercent = cohortPerformance.length > 0 
      ? cohortPerformance.reduce((sum, c) => sum + c.total_pnl_percent, 0) / cohortPerformance.length
      : 0;
    
    // Calculate aggregate Brier score
    const brierScores = cohortPerformance.map(c => c.brier_score).filter((s): s is number => s !== null);
    const avgBrierScore = brierScores.length > 0
      ? brierScores.reduce((a, b) => a + b, 0) / brierScores.length
      : null;
    
    // Calculate win rate from trades
    const winRateResult = db.prepare(`
      SELECT 
        COUNT(CASE WHEN 
          (t.side = m.resolution_outcome) THEN 1 END) as wins,
        COUNT(*) as total
      FROM trades t
      JOIN agents a ON t.agent_id = a.id
      JOIN markets m ON t.market_id = m.id
      WHERE a.model_id = ? 
        AND m.status = 'resolved'
        AND t.trade_type = 'BUY'
    `).get(id) as { wins: number; total: number } | undefined;
    
    const winRate = winRateResult && winRateResult.total > 0
      ? winRateResult.wins / winRateResult.total
      : null;
    
    // Get recent decisions across all cohorts
    const recentDecisions = db.prepare(`
      SELECT d.*, c.cohort_number
      FROM decisions d
      JOIN agents a ON d.agent_id = a.id
      JOIN cohorts c ON d.cohort_id = c.id
      WHERE a.model_id = ?
      ORDER BY d.decision_timestamp DESC
      LIMIT 20
    `).all(id);
    
    // Get equity curve (all snapshots across cohorts)
    const allSnapshots = db.prepare(`
      SELECT ps.*, c.cohort_number
      FROM portfolio_snapshots ps
      JOIN agents a ON ps.agent_id = a.id
      JOIN cohorts c ON a.cohort_id = c.id
      WHERE a.model_id = ?
      ORDER BY ps.snapshot_timestamp ASC
    `).all(id);
    
    return NextResponse.json({
      model,
      num_cohorts: agents.length,
      total_pnl: totalPnl,
      avg_pnl_percent: avgPnlPercent,
      avg_brier_score: avgBrierScore,
      win_rate: winRate,
      cohort_performance: cohortPerformance,
      recent_decisions: recentDecisions,
      equity_curve: allSnapshots,
      updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

