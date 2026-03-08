import { getDb } from '@/lib/db';

export type DecisionDetailResult =
  | {
      status: 'ok';
      data: {
        decision: Record<string, unknown>;
        trades: Array<Record<string, unknown>>;
      };
    }
  | {
      status: 'not_found';
      error: 'Decision not found';
    };

export function listRecentDecisions(limit: number) {
  const db = getDb();

  return {
    decisions: db.prepare(`
      SELECT
        d.id,
        d.agent_id,
        d.cohort_id,
        d.decision_week,
        d.decision_timestamp,
        d.action,
        d.reasoning,
        COALESCE(abi.family_display_name, abi.release_display_name, a.model_id) as model_display_name,
        COALESCE(abi.color, '#94A3B8') as model_color,
        COALESCE(abi.family_slug, abi.family_id, abi.legacy_model_id, a.model_id) as model_id,
        abi.family_slug as family_slug,
        abi.family_slug as model_slug,
        abi.legacy_model_id as legacy_model_id,
        abi.family_id as model_family_id,
        abi.release_id as model_release_id,
        abi.release_display_name as model_release_name,
        c.cohort_number
      FROM decisions d
      JOIN agents a ON d.agent_id = a.id
      LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
      JOIN cohorts c ON d.cohort_id = c.id
      WHERE d.action != 'ERROR'
      ORDER BY d.decision_timestamp DESC
      LIMIT ?
    `).all(limit) as Array<Record<string, unknown>>,
    updated_at: new Date().toISOString()
  };
}

export function getDecisionDetail(decisionId: string): DecisionDetailResult {
  const db = getDb();

  const decision = db.prepare(`
    SELECT
      d.*,
      COALESCE(abi.family_display_name, abi.release_display_name, a.model_id) as model_name,
      COALESCE(abi.color, '#94A3B8') as model_color,
      COALESCE(abi.provider, 'Unknown') as model_provider,
      COALESCE(abi.family_slug, abi.family_id, abi.legacy_model_id, a.model_id) as model_id,
      abi.family_slug as family_slug,
      abi.family_slug as model_slug,
      abi.legacy_model_id as legacy_model_id,
      abi.family_id as model_family_id,
      abi.release_id as model_release_id,
      abi.release_display_name as model_release_name
    FROM decisions d
    JOIN agents a ON d.agent_id = a.id
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    WHERE d.id = ?
  `).get(decisionId) as Record<string, unknown> | undefined;

  if (!decision) {
    return { status: 'not_found', error: 'Decision not found' };
  }

  const trades = db.prepare(`
    SELECT
      t.*,
      m.question as market_question,
      m.slug as market_slug,
      m.event_slug as market_event_slug,
      t.market_id
    FROM trades t
    JOIN markets m ON t.market_id = m.id
    JOIN decisions d ON t.decision_id = d.id
    WHERE t.decision_id = ?
  `).all(decisionId) as Array<Record<string, unknown>>;

  return {
    status: 'ok',
    data: {
      decision,
      trades
    }
  };
}
