/**
 * Market Detail API Endpoint
 * 
 * Returns detailed market data including positions and trades.
 * 
 * @route GET /api/markets/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getMarketById } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const market = getMarketById(id);

    if (!market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    const db = getDb();

// Get positions on this market with agent/model info
    const positionsStmt = db.prepare(`
      SELECT 
        p.*,
        a.id as agent_id,
        m.id as model_id,
        m.display_name as model_display_name,
        m.color as model_color,
        (
          SELECT decision_id FROM trades t
          WHERE t.agent_id = p.agent_id AND t.market_id = p.market_id 
          ORDER BY t.executed_at DESC LIMIT 1
        ) as decision_id
      FROM positions p
      JOIN agents a ON p.agent_id = a.id
      JOIN models m ON a.model_id = m.id
      WHERE p.market_id = ? AND p.status = 'open'
      ORDER BY p.total_cost DESC
    `);

    // Get trades on this market
    const tradesStmt = db.prepare(`
      SELECT
      t.*,
      m.display_name as model_display_name,
      m.color as model_color
      FROM trades t
      JOIN agents a ON t.agent_id = a.id
      JOIN models m ON a.model_id = m.id
      WHERE t.market_id = ?
      ORDER BY t.executed_at DESC
      LIMIT 100
    `);

    // Get Brier scores if market is resolved
    let brierScoresStmt = null;
    if (market.status === 'resolved') {
      brierScoresStmt = db.prepare(`
      SELECT
      bs.*,
      m.display_name as model_display_name,
      m.color as model_color
        FROM brier_scores bs
        JOIN agents a ON bs.agent_id = a.id
        JOIN models m ON a.model_id = m.id
        WHERE bs.market_id = ?
        ORDER BY bs.brier_score ASC
      `);
    }

    const positions = positionsStmt.all(id);
    const trades = tradesStmt.all(id);
    const brierScores = brierScoresStmt ? brierScoresStmt.all(id) : [];

    return NextResponse.json({
      market,
      positions,
      trades,
      brier_scores: brierScores,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



