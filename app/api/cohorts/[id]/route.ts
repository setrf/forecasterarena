/**
 * Cohort Detail API Endpoint
 * 
 * Returns detailed cohort data including all agents and performance.
 * 
 * @route GET /api/cohorts/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { 
  getCohortById,
  getAgentsWithModelsByCohort,
  getLatestSnapshot,
  getAverageBrierScore,
  getSnapshotsByAgent
} from '@/lib/db/queries';
import { calculateWeekNumber } from '@/lib/utils';
import { INITIAL_BALANCE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const cohort = getCohortById(id);
    
    if (!cohort) {
      return NextResponse.json(
        { error: 'Cohort not found' },
        { status: 404 }
      );
    }
    
    const db = getDb();
    
    // Get agents with model info and stats
    const rawAgents = getAgentsWithModelsByCohort(id);
    
    const agents = rawAgents.map(agent => {
      const snapshot = getLatestSnapshot(agent.id);
      const brierScore = getAverageBrierScore(agent.id);
      
      // Count positions and trades
      const positionCount = (db.prepare(`
        SELECT COUNT(*) as count FROM positions WHERE agent_id = ? AND status = 'open'
      `).get(agent.id) as { count: number }).count;
      
      const tradeCount = (db.prepare(`
        SELECT COUNT(*) as count FROM trades WHERE agent_id = ?
      `).get(agent.id) as { count: number }).count;
      
      return {
        id: agent.id,
        model_id: agent.model_id,
        model_display_name: agent.model.display_name,
        model_color: agent.model.color,
        cash_balance: agent.cash_balance,
        total_invested: agent.total_invested,
        status: agent.status,
        total_value: snapshot?.total_value || agent.cash_balance,
        total_pnl: snapshot?.total_pnl || 0,
        total_pnl_percent: snapshot?.total_pnl_percent || 0,
        brier_score: brierScore,
        position_count: positionCount,
        trade_count: tradeCount,
        num_resolved_bets: snapshot?.num_resolved_bets || 0
      };
    });
    
    // Sort by total value descending
    agents.sort((a, b) => b.total_value - a.total_value);
    
    // Calculate cohort stats
    const weekNumber = calculateWeekNumber(cohort.started_at);
    
    const totalTrades = (db.prepare(`
      SELECT COUNT(*) as count 
      FROM trades t 
      JOIN agents a ON t.agent_id = a.id 
      WHERE a.cohort_id = ?
    `).get(id) as { count: number }).count;
    
    const totalPositionsOpen = (db.prepare(`
      SELECT COUNT(*) as count 
      FROM positions p 
      JOIN agents a ON p.agent_id = a.id 
      WHERE a.cohort_id = ? AND p.status = 'open'
    `).get(id) as { count: number }).count;
    
    const marketsWithPositions = (db.prepare(`
      SELECT COUNT(DISTINCT p.market_id) as count 
      FROM positions p 
      JOIN agents a ON p.agent_id = a.id 
      WHERE a.cohort_id = ?
    `).get(id) as { count: number }).count;
    
    const brierScores = agents.map(a => a.brier_score).filter((s): s is number => s !== null);
    const avgBrierScore = brierScores.length > 0 
      ? brierScores.reduce((a, b) => a + b, 0) / brierScores.length 
      : null;
    
    // Build equity curves for chart
    const equityCurves: Record<string, Array<{ date: string; value: number }>> = {};
    
    for (const agent of rawAgents) {
      const snapshots = getSnapshotsByAgent(agent.id);
      equityCurves[agent.model_id] = snapshots.map(s => ({
        date: s.snapshot_date,
        value: s.total_value
      }));
    }
    
    // Get recent decisions
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
    `).all(id);
    
    return NextResponse.json({
      cohort,
      agents,
      stats: {
        week_number: weekNumber,
        total_trades: totalTrades,
        total_positions_open: totalPositionsOpen,
        markets_with_positions: marketsWithPositions,
        avg_brier_score: avgBrierScore
      },
      equity_curves: equityCurves,
      recent_decisions: recentDecisions,
      updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


