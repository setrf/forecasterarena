import { generateId, getDb } from '../index';
import type { BrierScoreRecord } from '../../types';

export function createBrierScore(score: {
  agent_id: string;
  trade_id: string;
  market_id: string;
  forecast_probability: number;
  actual_outcome: number;
  brier_score: number;
}): BrierScoreRecord {
  const db = getDb();
  const existing = db.prepare(`
    SELECT * FROM brier_scores
    WHERE trade_id = ?
    LIMIT 1
  `).get(score.trade_id) as BrierScoreRecord | undefined;

  if (existing) {
    return existing;
  }

  const id = generateId();

  db.prepare(`
    INSERT INTO brier_scores (
      id, agent_id, trade_id, market_id,
      forecast_probability, actual_outcome, brier_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    score.agent_id,
    score.trade_id,
    score.market_id,
    score.forecast_probability,
    score.actual_outcome,
    score.brier_score
  );

  return db.prepare('SELECT * FROM brier_scores WHERE id = ?').get(id) as BrierScoreRecord;
}

export function getBrierScoresByAgent(agentId: string): BrierScoreRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM brier_scores
    WHERE agent_id = ?
    ORDER BY calculated_at DESC
  `).all(agentId) as BrierScoreRecord[];
}

export function getAverageBrierScore(agentId: string): number | null {
  const db = getDb();
  const result = db.prepare(`
    SELECT AVG(brier_score) as avg_brier
    FROM brier_scores
    WHERE agent_id = ?
  `).get(agentId) as { avg_brier: number | null };

  return result.avg_brier;
}
