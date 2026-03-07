import type { Db } from '@/lib/application/models/queries/types';

export function getModelWinRate(
  db: Db,
  modelId: string
): { wins: number; total: number } | undefined {
  return db.prepare(`
    SELECT
      COUNT(CASE WHEN (t.side = m.resolution_outcome) THEN 1 END) as wins,
      COUNT(*) as total
    FROM trades t
    JOIN agents a ON t.agent_id = a.id
    JOIN markets m ON t.market_id = m.id
    WHERE a.model_id = ?
      AND m.status = 'resolved'
      AND t.trade_type = 'BUY'
  `).get(modelId) as { wins: number; total: number } | undefined;
}

export function getModelEquitySnapshots(
  db: Db,
  modelId: string
): Array<{ snapshot_timestamp: string; total_value: number }> {
  return db.prepare(`
    SELECT ps.snapshot_timestamp, ps.total_value
    FROM portfolio_snapshots ps
    JOIN agents a ON ps.agent_id = a.id
    WHERE a.model_id = ?
    ORDER BY ps.snapshot_timestamp ASC
  `).all(modelId) as Array<{ snapshot_timestamp: string; total_value: number }>;
}
