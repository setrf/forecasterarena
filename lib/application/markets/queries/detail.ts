import type { Db } from '@/lib/application/markets/queries/types';

export function selectMarketPositions(
  db: Db,
  marketId: string
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      p.*,
      a.id as agent_id,
      COALESCE(abi.family_slug, abi.family_id, abi.legacy_model_id, a.model_id) as model_id,
      abi.family_slug as model_slug,
      abi.legacy_model_id as legacy_model_id,
      abi.family_id,
      abi.release_id,
      COALESCE(abi.family_display_name, abi.release_display_name, a.model_id) as model_display_name,
      abi.release_display_name as model_release_name,
      COALESCE(abi.color, '#94A3B8') as model_color,
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
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    WHERE p.market_id = ? AND p.status = 'open'
    ORDER BY p.total_cost DESC
  `).all(marketId) as Array<Record<string, unknown>>;
}

export function selectMarketTrades(
  db: Db,
  marketId: string
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      t.*,
      COALESCE(abi.family_display_name, abi.release_display_name, a.model_id) as model_display_name,
      abi.release_display_name as model_release_name,
      COALESCE(abi.color, '#94A3B8') as model_color,
      COALESCE(abi.family_slug, abi.family_id, abi.legacy_model_id, a.model_id) as model_id,
      abi.family_slug as model_slug,
      abi.legacy_model_id as legacy_model_id,
      abi.family_id,
      abi.release_id
    FROM trades t
    JOIN agents a ON t.agent_id = a.id
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    WHERE t.market_id = ?
    ORDER BY t.executed_at DESC
    LIMIT 100
  `).all(marketId) as Array<Record<string, unknown>>;
}

export function selectMarketBrierScores(
  db: Db,
  marketId: string
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      bs.*,
      COALESCE(abi.family_display_name, abi.release_display_name, a.model_id) as model_display_name,
      abi.release_display_name as model_release_name,
      COALESCE(abi.color, '#94A3B8') as model_color,
      COALESCE(abi.family_slug, abi.family_id, abi.legacy_model_id, a.model_id) as model_id,
      abi.family_slug as model_slug,
      abi.legacy_model_id as legacy_model_id,
      abi.family_id,
      abi.release_id
    FROM brier_scores bs
    JOIN agents a ON bs.agent_id = a.id
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    WHERE bs.market_id = ?
    ORDER BY bs.brier_score ASC
  `).all(marketId) as Array<Record<string, unknown>>;
}
