import type { Db } from '@/lib/application/markets/queries/types';

export function selectMarketPositions(
  db: Db,
  marketId: string
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      p.*,
      a.id as agent_id,
      COALESCE(abi.family_slug, abi.family_id, abi.legacy_model_id, a.model_id) as family_slug,
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
    JOIN cohorts c ON c.id = a.cohort_id
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    WHERE p.market_id = ?
      AND p.status = 'open'
      AND COALESCE(c.is_archived, 0) = 0
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
      COALESCE(tf.public_display_name, dbi.family_display_name, abi.family_display_name, abi.release_display_name, a.model_id) as model_display_name,
      COALESCE(tr.release_name, dbi.release_display_name, abi.release_display_name) as model_release_name,
      COALESCE(tf.color, dbi.color, abi.color, '#94A3B8') as model_color,
      COALESCE(tf.slug, dbi.family_slug, abi.family_slug, abi.family_id, abi.legacy_model_id, a.model_id) as family_slug,
      COALESCE(tf.legacy_model_id, dbi.legacy_model_id, abi.legacy_model_id) as legacy_model_id,
      COALESCE(t.family_id, dbi.family_id, abi.family_id) as family_id,
      COALESCE(t.release_id, dbi.release_id, abi.release_id) as release_id
    FROM trades t
    JOIN agents a ON t.agent_id = a.id
    JOIN cohorts c ON c.id = a.cohort_id
    LEFT JOIN decisions d ON d.id = t.decision_id
    LEFT JOIN decision_benchmark_identity_v dbi ON dbi.decision_id = d.id
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    LEFT JOIN model_families tf ON tf.id = t.family_id
    LEFT JOIN model_releases tr ON tr.id = t.release_id
    WHERE t.market_id = ?
      AND COALESCE(c.is_archived, 0) = 0
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
      COALESCE(bf.public_display_name, dbi.family_display_name, abi.family_display_name, abi.release_display_name, a.model_id) as model_display_name,
      COALESCE(br.release_name, dbi.release_display_name, abi.release_display_name) as model_release_name,
      COALESCE(bf.color, dbi.color, abi.color, '#94A3B8') as model_color,
      COALESCE(bf.slug, dbi.family_slug, abi.family_slug, abi.family_id, abi.legacy_model_id, a.model_id) as family_slug,
      COALESCE(bf.legacy_model_id, dbi.legacy_model_id, abi.legacy_model_id) as legacy_model_id,
      COALESCE(bs.family_id, dbi.family_id, abi.family_id) as family_id,
      COALESCE(bs.release_id, dbi.release_id, abi.release_id) as release_id
    FROM brier_scores bs
    JOIN agents a ON bs.agent_id = a.id
    JOIN cohorts c ON c.id = a.cohort_id
    LEFT JOIN trades t ON t.id = bs.trade_id
    LEFT JOIN decisions d ON d.id = t.decision_id
    LEFT JOIN decision_benchmark_identity_v dbi ON dbi.decision_id = d.id
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    LEFT JOIN model_families bf ON bf.id = bs.family_id
    LEFT JOIN model_releases br ON br.id = bs.release_id
    WHERE bs.market_id = ?
      AND COALESCE(c.is_archived, 0) = 0
    ORDER BY bs.brier_score ASC
  `).all(marketId) as Array<Record<string, unknown>>;
}
