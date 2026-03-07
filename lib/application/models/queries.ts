import { getDb } from '@/lib/db';
import type { AgentWithCohort } from '@/lib/application/models/types';

export function getAgentsForModel(modelId: string): AgentWithCohort[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      a.*,
      c.cohort_number,
      c.started_at as cohort_started_at,
      c.status as cohort_status
    FROM agents a
    JOIN cohorts c ON a.cohort_id = c.id
    WHERE a.model_id = ?
    ORDER BY c.started_at DESC
  `).all(modelId) as AgentWithCohort[];
}

export function getModelWinRate(modelId: string): number | null {
  const db = getDb();
  const result = db.prepare(`
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

  return result && result.total > 0
    ? result.wins / result.total
    : null;
}

export function getRecentModelDecisions(modelId: string): Array<Record<string, unknown>> {
  const db = getDb();
  return db.prepare(`
    SELECT d.*, c.cohort_number
    FROM decisions d
    JOIN agents a ON d.agent_id = a.id
    JOIN cohorts c ON d.cohort_id = c.id
    WHERE a.model_id = ?
    ORDER BY d.decision_timestamp DESC
    LIMIT 20
  `).all(modelId) as Array<Record<string, unknown>>;
}

export function getModelEquityCurve(modelId: string): Array<{
  snapshot_timestamp: string;
  total_value: number;
}> {
  const db = getDb();
  const rawSnapshots = db.prepare(`
    SELECT ps.snapshot_timestamp, ps.total_value
    FROM portfolio_snapshots ps
    JOIN agents a ON ps.agent_id = a.id
    WHERE a.model_id = ?
    ORDER BY ps.snapshot_timestamp ASC
  `).all(modelId) as Array<{ snapshot_timestamp: string; total_value: number }>;

  const snapshotsByTime = new Map<string, number[]>();
  for (const snapshot of rawSnapshots) {
    if (!snapshotsByTime.has(snapshot.snapshot_timestamp)) {
      snapshotsByTime.set(snapshot.snapshot_timestamp, []);
    }

    snapshotsByTime.get(snapshot.snapshot_timestamp)!.push(snapshot.total_value);
  }

  return Array.from(snapshotsByTime.entries()).map(([timestamp, values]) => ({
    snapshot_timestamp: timestamp,
    total_value: values.reduce((sum, value) => sum + value, 0) / values.length
  }));
}
