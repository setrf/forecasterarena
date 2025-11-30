/**
 * Admin Costs API Endpoint
 * 
 * Returns API cost breakdown by model.
 * 
 * @route GET /api/admin/costs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { MODELS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // Get costs aggregated by model
    const rawCosts = db.prepare(`
      SELECT 
        m.id as model_id,
        m.display_name as model_name,
        m.color,
        COALESCE(SUM(ac.cost_usd), 0) as total_cost,
        COALESCE(SUM(ac.tokens_input), 0) as total_input_tokens,
        COALESCE(SUM(ac.tokens_output), 0) as total_output_tokens,
        COUNT(ac.id) as decision_count
      FROM models m
      LEFT JOIN api_costs ac ON m.id = ac.model_id
      GROUP BY m.id, m.display_name, m.color
      ORDER BY total_cost DESC
    `).all() as Array<{
      model_id: string;
      model_name: string;
      color: string;
      total_cost: number;
      total_input_tokens: number;
      total_output_tokens: number;
      decision_count: number;
    }>;
    
    // Ensure all models are represented
    const costsByModel = MODELS.map(model => {
      const existing = rawCosts.find(c => c.model_id === model.id);
      return existing || {
        model_id: model.id,
        model_name: model.displayName,
        color: model.color,
        total_cost: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        decision_count: 0
      };
    });
    
    // Calculate summary
    const totalCost = costsByModel.reduce((sum, m) => sum + m.total_cost, 0);
    const totalInputTokens = costsByModel.reduce((sum, m) => sum + m.total_input_tokens, 0);
    const totalOutputTokens = costsByModel.reduce((sum, m) => sum + m.total_output_tokens, 0);
    const totalDecisions = costsByModel.reduce((sum, m) => sum + m.decision_count, 0);
    
    return NextResponse.json({
      costs_by_model: costsByModel,
      summary: {
        total_cost: totalCost,
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        total_decisions: totalDecisions,
        avg_cost_per_decision: totalDecisions > 0 ? totalCost / totalDecisions : 0
      },
      updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


