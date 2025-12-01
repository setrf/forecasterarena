/**
 * Performance Data API Endpoint
 * 
 * Returns aggregated snapshot data for performance charts.
 * 
 * @route GET /api/performance-data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { MODELS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '1M';
    const cohortId = searchParams.get('cohort_id');
    
    const db = getDb();
    
    // Calculate date range
    let daysBack = 30;
    switch (range) {
      case '1W': daysBack = 7; break;
      case '1M': daysBack = 30; break;
      case '3M': daysBack = 90; break;
      case 'ALL': daysBack = 365 * 10; break;
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Build query for snapshots
    let query = `
      SELECT 
        ps.snapshot_date,
        m.id as model_id,
        m.display_name,
        m.color,
        ps.total_value
      FROM portfolio_snapshots ps
      JOIN agents a ON ps.agent_id = a.id
      JOIN models m ON a.model_id = m.id
      WHERE ps.snapshot_date >= ?
    `;
    const params: (string | number)[] = [startDateStr];
    
    if (cohortId) {
      query += ' AND a.cohort_id = ?';
      params.push(cohortId);
    }
    
    query += ' ORDER BY ps.snapshot_date ASC, m.display_name ASC';
    
    const rows = db.prepare(query).all(...params) as Array<{
      snapshot_date: string;
      model_id: string;
      display_name: string;
      color: string;
      total_value: number;
    }>;
    
    // Group by date and pivot to wide format
    const dataByDate = new Map<string, Record<string, number | string>>();
    
    for (const row of rows) {
      if (!dataByDate.has(row.snapshot_date)) {
        dataByDate.set(row.snapshot_date, { date: row.snapshot_date });
      }
      const dateData = dataByDate.get(row.snapshot_date)!;
      
      // If cohort filter, use exact value; otherwise average across cohorts
      if (dateData[row.model_id] === undefined) {
        dateData[row.model_id] = row.total_value;
      } else {
        // Average if multiple cohorts
        dateData[row.model_id] = ((dateData[row.model_id] as number) + row.total_value) / 2;
      }
    }
    
    const data = Array.from(dataByDate.values());
    
    // Model configs for the chart
    const models = MODELS.map(m => ({
      id: m.id,
      name: m.displayName,
      color: m.color
    }));
    
    return NextResponse.json({
      data,
      models,
      range,
      updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



