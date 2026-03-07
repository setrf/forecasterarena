import type { Db } from '@/lib/application/markets/queries/types';

export function selectMarketCategories(db: Db): string[] {
  const rows = db.prepare(`
    SELECT DISTINCT category
    FROM markets
    WHERE category IS NOT NULL
    ORDER BY category
  `).all() as Array<{ category: string }>;

  return rows.map((row) => row.category);
}

export function selectMarketStats(db: Db): {
  total_markets: number;
  active_markets: number;
  markets_with_positions: number;
} {
  return db.prepare(`
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
}
