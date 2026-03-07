import { getDb } from '@/lib/db';
import { getMarketById } from '@/lib/db/queries';

export type MarketSortOption = 'volume' | 'close_date' | 'created';

export interface ListMarketsInput {
  status: string;
  category?: string | null;
  search?: string | null;
  sort: MarketSortOption;
  withCohortBets: boolean;
  limit: number;
  offset: number;
}

type ListMarketsResult = {
  markets: Array<Record<string, unknown>>;
  total: number;
  has_more: boolean;
  categories: string[];
  stats: {
    total_markets: number;
    active_markets: number;
    markets_with_positions: number;
    categories_count: number;
  };
  updated_at: string;
};

type MarketDetailResult =
  | {
      status: 'ok';
      data: {
        market: NonNullable<ReturnType<typeof getMarketById>>;
        positions: Array<Record<string, unknown>>;
        trades: Array<Record<string, unknown>>;
        brier_scores: Array<Record<string, unknown>>;
        updated_at: string;
      };
    }
  | {
      status: 'not_found';
      error: 'Market not found';
    };

function getMarketsOrderBy(sort: MarketSortOption): string {
  switch (sort) {
    case 'close_date':
      return 'close_date ASC';
    case 'created':
      return 'first_seen_at DESC';
    case 'volume':
    default:
      return 'volume DESC NULLS LAST';
  }
}

export function listMarkets({
  status,
  category,
  search,
  sort,
  withCohortBets,
  limit,
  offset
}: ListMarketsInput): ListMarketsResult {
  const db = getDb();
  const conditions: string[] = [];
  const params: Array<string | number> = [];

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
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const total = (db.prepare(`SELECT COUNT(*) as total FROM markets m ${whereClause}`)
    .get(...params) as { total: number }).total;

  const markets = db.prepare(`
    SELECT
      m.*,
      (SELECT COUNT(DISTINCT p.agent_id) FROM positions p WHERE p.market_id = m.id AND p.status = 'open') as positions_count
    FROM markets m
    ${whereClause}
    ORDER BY ${getMarketsOrderBy(sort)}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<Record<string, unknown>>;

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
    has_more: offset + limit < total,
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

export function getMarketDetail(marketId: string): MarketDetailResult {
  const market = getMarketById(marketId);
  if (!market) {
    return { status: 'not_found', error: 'Market not found' };
  }

  const db = getDb();

  const positions = db.prepare(`
    SELECT
      p.*,
      a.id as agent_id,
      m.id as model_id,
      m.display_name as model_display_name,
      m.color as model_color,
      COALESCE(
        (
          SELECT decision_id FROM trades t
          WHERE t.position_id = p.id
            AND t.trade_type = 'BUY'
            AND t.decision_id IS NOT NULL
          ORDER BY t.executed_at ASC
          LIMIT 1
        ),
        (
          SELECT decision_id FROM trades t
          WHERE t.agent_id = p.agent_id
            AND t.market_id = p.market_id
            AND t.side = p.side
            AND t.trade_type = 'BUY'
            AND t.decision_id IS NOT NULL
          ORDER BY t.executed_at ASC
          LIMIT 1
        )
      ) as decision_id
    FROM positions p
    JOIN agents a ON p.agent_id = a.id
    JOIN models m ON a.model_id = m.id
    WHERE p.market_id = ? AND p.status = 'open'
    ORDER BY p.total_cost DESC
  `).all(marketId) as Array<Record<string, unknown>>;

  const trades = db.prepare(`
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
  `).all(marketId) as Array<Record<string, unknown>>;

  const brierScores = market.status === 'resolved'
    ? db.prepare(`
      SELECT
        bs.*,
        m.display_name as model_display_name,
        m.color as model_color
      FROM brier_scores bs
      JOIN agents a ON bs.agent_id = a.id
      JOIN models m ON a.model_id = m.id
      WHERE bs.market_id = ?
      ORDER BY bs.brier_score ASC
    `).all(marketId) as Array<Record<string, unknown>>
    : [];

  return {
    status: 'ok',
    data: {
      market,
      positions,
      trades,
      brier_scores: brierScores,
      updated_at: new Date().toISOString()
    }
  };
}
