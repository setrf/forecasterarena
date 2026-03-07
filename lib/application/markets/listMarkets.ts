import { getDb } from '@/lib/db';
import { getMarketsOrderBy } from '@/lib/application/markets/orderBy';
import type {
  ListMarketsInput,
  ListMarketsResult
} from '@/lib/application/markets/types';

function buildListMarketsFilter(args: ListMarketsInput): {
  whereClause: string;
  params: Array<string | number>;
} {
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (args.status !== 'all') {
    conditions.push('m.status = ?');
    params.push(args.status);
  }

  if (args.category) {
    conditions.push('m.category = ?');
    params.push(args.category);
  }

  if (args.search) {
    conditions.push('m.question LIKE ?');
    params.push(`%${args.search}%`);
  }

  if (args.withCohortBets) {
    conditions.push(`EXISTS (
      SELECT 1 FROM positions p
      JOIN agents a ON p.agent_id = a.id
      JOIN cohorts c ON a.cohort_id = c.id
      WHERE p.market_id = m.id
        AND c.status = 'active'
        AND p.status = 'open'
    )`);
  }

  return {
    whereClause: conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '',
    params
  };
}

export function listMarkets(args: ListMarketsInput): ListMarketsResult {
  const db = getDb();
  const { whereClause, params } = buildListMarketsFilter(args);

  const total = (db.prepare(`SELECT COUNT(*) as total FROM markets m ${whereClause}`)
    .get(...params) as { total: number }).total;

  const markets = db.prepare(`
    SELECT
      m.*,
      (SELECT COUNT(DISTINCT p.agent_id) FROM positions p WHERE p.market_id = m.id AND p.status = 'open') as positions_count
    FROM markets m
    ${whereClause}
    ORDER BY ${getMarketsOrderBy(args.sort)}
    LIMIT ? OFFSET ?
  `).all(...params, args.limit, args.offset) as Array<Record<string, unknown>>;

  const categories = db.prepare(`
    SELECT DISTINCT category
    FROM markets
    WHERE category IS NOT NULL
    ORDER BY category
  `).all() as Array<{ category: string }>;

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_markets,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_markets,
      (SELECT COUNT(DISTINCT m.id)
       FROM markets m
       WHERE EXISTS (
         SELECT 1 FROM positions p
         WHERE p.market_id = m.id
           AND p.status = 'open'
       )
      ) as markets_with_positions
    FROM markets
  `).get() as {
    total_markets: number;
    active_markets: number;
    markets_with_positions: number;
  };

  return {
    markets,
    total,
    has_more: args.offset + args.limit < total,
    categories: categories.map((item) => item.category),
    stats: {
      total_markets: stats.total_markets,
      active_markets: stats.active_markets,
      markets_with_positions: stats.markets_with_positions,
      categories_count: categories.length
    },
    updated_at: new Date().toISOString()
  };
}
