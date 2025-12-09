/**
 * Markets List API Endpoint
 * 
 * Returns paginated list of markets with filtering options.
 * 
 * @route GET /api/markets
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status') || 'active';
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'volume';
    const withCohortBets = searchParams.get('cohort_bets') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const db = getDb();
    
    // Build WHERE clause
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    
    if (status !== 'all') {
      conditions.push('m.status = ?');
      params.push(status);
    }
    
    if (category) {
      conditions.push('m.category = ?');
      params.push(category);
    }
    
    if (search) {
      conditions.push('m.question LIKE ?');
      params.push(`%${search}%`);
    }
    
    // Filter for markets with bets from current cohort
    if (withCohortBets) {
      conditions.push(`EXISTS (
        SELECT 1 FROM positions p
        JOIN agents a ON p.agent_id = a.id
        JOIN cohorts c ON a.cohort_id = c.id
        WHERE p.market_id = m.id
        AND c.status = 'active'
        AND p.status = 'open'
      )`);
    }
    
    const whereClause = conditions.length > 0 
      ? 'WHERE ' + conditions.join(' AND ')
      : '';
    
    // Build ORDER BY clause
    let orderBy = 'volume DESC NULLS LAST';
    switch (sort) {
      case 'close_date': orderBy = 'close_date ASC'; break;
      case 'created': orderBy = 'first_seen_at DESC'; break;
      case 'volume': 
      default: orderBy = 'volume DESC NULLS LAST';
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM markets m ${whereClause}`;
    const countResult = db.prepare(countQuery).get(...params) as { total: number };
    const total = countResult.total;
    
    // Get markets with position counts
    const query = `
      SELECT 
        m.*,
        (SELECT COUNT(DISTINCT p.agent_id) FROM positions p WHERE p.market_id = m.id AND p.status = 'open') as positions_count
      FROM markets m
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    
    const markets = db.prepare(query).all(...params, limit, offset);
    
    // Get categories for filter dropdown
    const categories = db.prepare(`
      SELECT DISTINCT category 
      FROM markets 
      WHERE category IS NOT NULL 
      ORDER BY category
    `).all() as { category: string }[];
    
    return NextResponse.json({
      markets,
      total,
      has_more: offset + limit < total,
      categories: categories.map(c => c.category),
      updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


