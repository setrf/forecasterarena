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
import { safeErrorMessage } from '@/lib/utils/security';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';

export const dynamic = 'force-dynamic';

function getRangeStart(range: TimeRange, now: Date): string {
  const start = new Date(now);

  switch (range) {
    case '10M':
      start.setMinutes(start.getMinutes() - 10);
      break;
    case '1H':
      start.setHours(start.getHours() - 1);
      break;
    case '1D':
      start.setDate(start.getDate() - 1);
      break;
    case '1W':
      start.setDate(start.getDate() - 7);
      break;
    case '1M':
      start.setMonth(start.getMonth() - 1);
      break;
    case '3M':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'ALL':
      start.setFullYear(start.getFullYear() - 10);
      break;
    default:
      start.setMonth(start.getMonth() - 1);
      break;
  }

  return start.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawRange = searchParams.get('range');
    const range = (rawRange || '1M') as TimeRange;
    const cohortId = searchParams.get('cohort_id');
    
    const db = getDb();
    const startDateStr = getRangeStart(range, new Date());
    
    // Build query for snapshots
    let query = `
      SELECT 
        ps.snapshot_timestamp,
        m.id as model_id,
        m.display_name,
        m.color,
        ps.total_value
      FROM portfolio_snapshots ps
      JOIN agents a ON ps.agent_id = a.id
      JOIN models m ON a.model_id = m.id
      WHERE ps.snapshot_timestamp >= ?
    `;
    const params: (string | number)[] = [startDateStr];
    
    if (cohortId) {
      query += ' AND a.cohort_id = ?';
      params.push(cohortId);
    }
    
    query += ' ORDER BY ps.snapshot_timestamp ASC, m.display_name ASC';
    
    const rows = db.prepare(query).all(...params) as Array<{
      snapshot_timestamp: string;
      model_id: string;
      display_name: string;
      color: string;
      total_value: number;
    }>;
    
    // Group by date and pivot to wide format
    // Track sums and counts separately to compute correct averages
    const dataByDate = new Map<string, Record<string, number | string>>();
    const countsByDate = new Map<string, Record<string, number>>();

    for (const row of rows) {
      if (!dataByDate.has(row.snapshot_timestamp)) {
        dataByDate.set(row.snapshot_timestamp, { date: row.snapshot_timestamp });
        countsByDate.set(row.snapshot_timestamp, {});
      }
      const dateData = dataByDate.get(row.snapshot_timestamp)!;
      const counts = countsByDate.get(row.snapshot_timestamp)!;

      // Accumulate sum and count for proper averaging across cohorts
      if (dateData[row.model_id] === undefined) {
        dateData[row.model_id] = row.total_value;
        counts[row.model_id] = 1;
      } else {
        dateData[row.model_id] = (dateData[row.model_id] as number) + row.total_value;
        counts[row.model_id] = (counts[row.model_id] || 1) + 1;
      }
    }

    // Convert sums to averages
    dataByDate.forEach((dateData, timestamp) => {
      const counts = countsByDate.get(timestamp)!;
      for (const modelId of Object.keys(counts)) {
        if (counts[modelId] > 1) {
          dateData[modelId] = (dateData[modelId] as number) / counts[modelId];
        }
      }
    });

    const data = Array.from(dataByDate.values());
    
    // Model configs for the chart
    const models = MODELS.map(m => ({
      id: m.id,
      name: m.displayName,
      color: m.color
    }));
    
    const response = NextResponse.json({
      data,
      models,
      range,
      updated_at: new Date().toISOString()
    });

    // Cache for 5 minutes - performance data doesn't change frequently
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    return response;

  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}


