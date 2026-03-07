import { getMarketsOrderBy } from '@/lib/application/markets/queries/orderBy';
import type { Db, MarketsWhereClause, SqlParam } from '@/lib/application/markets/queries/types';
import type { ListMarketsInput, MarketSortOption } from '@/lib/application/markets/types';

export function buildListMarketsWhereClause({
  status,
  category,
  search,
  withCohortBets
}: Pick<ListMarketsInput, 'status' | 'category' | 'search' | 'withCohortBets'>): MarketsWhereClause {
  const conditions: string[] = [];
  const params: SqlParam[] = [];

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

  return {
    whereClause: conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '',
    params
  };
}

export function countListedMarkets(
  db: Db,
  whereClause: string,
  params: SqlParam[]
): number {
  return (db.prepare(`SELECT COUNT(*) as total FROM markets m ${whereClause}`)
    .get(...params) as { total: number }).total;
}

export function selectListedMarkets(
  db: Db,
  whereClause: string,
  params: SqlParam[],
  sort: MarketSortOption,
  limit: number,
  offset: number
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      m.*,
      (SELECT COUNT(DISTINCT p.agent_id) FROM positions p WHERE p.market_id = m.id AND p.status = 'open') as positions_count
    FROM markets m
    ${whereClause}
    ORDER BY ${getMarketsOrderBy(sort)}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<Record<string, unknown>>;
}
