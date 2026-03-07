import { getDb } from '@/lib/db';
import { getMarketById } from '@/lib/db/queries';
import type { MarketDetailResult } from '@/lib/application/markets/types';

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
