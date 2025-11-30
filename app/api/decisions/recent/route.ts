/**
 * Recent Decisions API Endpoint
 * 
 * Returns the most recent LLM decisions across all cohorts.
 * 
 * @route GET /api/decisions/recent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    
    const db = getDb();
    
    const decisions = db.prepare(`
      SELECT 
        d.id,
        d.agent_id,
        d.cohort_id,
        d.decision_week,
        d.decision_timestamp,
        d.action,
        d.reasoning,
        m.display_name as model_display_name,
        m.color as model_color,
        c.cohort_number
      FROM decisions d
      JOIN agents a ON d.agent_id = a.id
      JOIN models m ON a.model_id = m.id
      JOIN cohorts c ON d.cohort_id = c.id
      WHERE d.action != 'ERROR'
      ORDER BY d.decision_timestamp DESC
      LIMIT ?
    `).all(limit);
    
    return NextResponse.json({
      decisions,
      updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

