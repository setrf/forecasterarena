/**
 * Admin Stats API Endpoint
 * 
 * Returns system statistics for the admin dashboard.
 * 
 * @route GET /api/admin/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // Get active cohorts count
    const activeCohorts = (db.prepare(`
      SELECT COUNT(*) as count FROM cohorts WHERE status = 'active'
    `).get() as { count: number }).count;
    
    // Get total agents count
    const totalAgents = (db.prepare(`
      SELECT COUNT(*) as count FROM agents
    `).get() as { count: number }).count;
    
    // Get markets tracked count
    const marketsTracked = (db.prepare(`
      SELECT COUNT(*) as count FROM markets
    `).get() as { count: number }).count;
    
    // Get total API costs
    const totalCost = (db.prepare(`
      SELECT COALESCE(SUM(cost_usd), 0) as total FROM api_costs
    `).get() as { total: number }).total;
    
    return NextResponse.json({
      active_cohorts: activeCohorts,
      total_agents: totalAgents,
      markets_tracked: marketsTracked,
      total_api_cost: totalCost,
      updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

