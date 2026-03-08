import { getDb } from '../index';
import { INITIAL_BALANCE } from '../../constants';
import type { CohortSummary, LeaderboardEntry } from '../../types';

export function getAggregateLeaderboard(): LeaderboardEntry[] {
  const db = getDb();
  const results = db.prepare(`
    WITH latest_snapshots AS (
      SELECT
        ps.*,
        ROW_NUMBER() OVER (PARTITION BY ps.agent_id ORDER BY ps.snapshot_timestamp DESC) as rn
      FROM portfolio_snapshots ps
    ),
    open_position_values AS (
      SELECT
        p.agent_id,
        COALESCE(SUM(COALESCE(p.current_value, p.total_cost)), 0) as total_position_value
      FROM positions p
      WHERE p.status = 'open'
      GROUP BY p.agent_id
    ),
    agent_identity AS (
      SELECT
        a.id as agent_id,
        COALESCE(abi.family_slug, abi.family_id) as family_slug,
        abi.family_id as family_id,
        abi.legacy_model_id as legacy_model_id,
        COALESCE(abi.family_display_name, abi.release_display_name, a.model_id) as display_name,
        COALESCE(abi.provider, 'Unknown') as provider,
        COALESCE(abi.color, '#94A3B8') as color
      FROM agents a
      LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    ),
    agent_stats AS (
      SELECT
        ai.family_slug,
        ai.family_id,
        ai.legacy_model_id,
        ai.display_name,
        ai.provider,
        ai.color,
        COUNT(DISTINCT a.id) as num_cohorts,
        SUM(
          COALESCE(
            ls.total_pnl,
            a.cash_balance + COALESCE(op.total_position_value, 0) - ?
          )
        ) as total_pnl,
        SUM(COALESCE(ls.num_resolved_bets, 0)) as total_resolved_bets
      FROM agents a
      JOIN agent_identity ai ON ai.agent_id = a.id
      LEFT JOIN latest_snapshots ls ON a.id = ls.agent_id AND ls.rn = 1
      LEFT JOIN open_position_values op ON a.id = op.agent_id
      GROUP BY
        ai.family_slug,
        ai.family_id,
        ai.legacy_model_id,
        ai.display_name,
        ai.provider,
        ai.color
    ),
    brier_stats AS (
      SELECT
        ai.family_slug,
        AVG(bs.brier_score) as avg_brier_score
      FROM brier_scores bs
      JOIN agents a ON bs.agent_id = a.id
      JOIN agent_identity ai ON ai.agent_id = a.id
      GROUP BY ai.family_slug
    ),
    win_stats AS (
      SELECT
        ai.family_slug,
        COUNT(CASE WHEN
          (t.side = 'YES' AND m.resolution_outcome = 'YES') OR
          (t.side = 'NO' AND m.resolution_outcome = 'NO') OR
          (t.side = m.resolution_outcome)
        THEN 1 END) as wins,
        COUNT(*) as total_bets
      FROM brier_scores bs
      JOIN agents a ON bs.agent_id = a.id
      JOIN agent_identity ai ON ai.agent_id = a.id
      JOIN trades t ON bs.trade_id = t.id
      JOIN markets m ON bs.market_id = m.id
      WHERE m.status = 'resolved'
      GROUP BY ai.family_slug
    )
    SELECT
      s.family_slug,
      s.family_id,
      s.legacy_model_id,
      s.display_name,
      s.provider,
      s.color,
      COALESCE(s.total_pnl, 0) as total_pnl,
      CASE WHEN s.num_cohorts > 0
        THEN (COALESCE(s.total_pnl, 0) / (s.num_cohorts * ?)) * 100
        ELSE 0
      END as total_pnl_percent,
      b.avg_brier_score,
      COALESCE(s.num_cohorts, 0) as num_cohorts,
      COALESCE(s.total_resolved_bets, 0) as num_resolved_bets,
      CASE WHEN w.total_bets > 0
        THEN CAST(w.wins AS REAL) / w.total_bets
        ELSE NULL
      END as win_rate
    FROM agent_stats s
    LEFT JOIN brier_stats b ON s.family_slug = b.family_slug
    LEFT JOIN win_stats w ON s.family_slug = w.family_slug
    WHERE COALESCE(s.num_cohorts, 0) > 0
    ORDER BY total_pnl DESC
  `).all(INITIAL_BALANCE, INITIAL_BALANCE) as LeaderboardEntry[];

  return results;
}

export function getCohortSummaries(): CohortSummary[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      c.id,
      c.cohort_number,
      c.started_at,
      c.status,
      c.methodology_version,
      COUNT(DISTINCT a.id) as num_agents,
      COUNT(DISTINCT t.market_id) as total_markets_traded
    FROM cohorts c
    LEFT JOIN agents a ON c.id = a.cohort_id
    LEFT JOIN trades t ON a.id = t.agent_id
    GROUP BY c.id
    ORDER BY c.started_at DESC
  `).all() as CohortSummary[];
}
