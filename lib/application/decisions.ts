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
        m.display_name as model_display_name,
        m.color as model_color,
        c.cohort_number
      FROM decisions d
      JOIN agents a ON d.agent_id = a.id
      JOIN models m ON a.model_id = m.id
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
      mod.display_name as model_name,
      mod.color as model_color,
      mod.provider as model_provider,
      mod.id as model_id
    FROM decisions d
    JOIN agents a ON d.agent_id = a.id
    JOIN models mod ON a.model_id = mod.id
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
