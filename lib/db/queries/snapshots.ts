import { generateId, getDb } from '../index';
import type { PortfolioSnapshot } from '../../types';

export function createPortfolioSnapshot(snapshot: {
  agent_id: string;
  snapshot_timestamp: string;
  cash_balance: number;
  positions_value: number;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  brier_score?: number;
  num_resolved_bets?: number;
}): PortfolioSnapshot {
  const db = getDb();
  const id = generateId();

  db.prepare(`
    INSERT INTO portfolio_snapshots (
      id, agent_id, snapshot_timestamp, cash_balance, positions_value,
      total_value, total_pnl, total_pnl_percent, brier_score, num_resolved_bets
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_id, snapshot_timestamp) DO UPDATE SET
      cash_balance = excluded.cash_balance,
      positions_value = excluded.positions_value,
      total_value = excluded.total_value,
      total_pnl = excluded.total_pnl,
      total_pnl_percent = excluded.total_pnl_percent,
      brier_score = excluded.brier_score,
      num_resolved_bets = excluded.num_resolved_bets
  `).run(
    id,
    snapshot.agent_id,
    snapshot.snapshot_timestamp,
    snapshot.cash_balance,
    snapshot.positions_value,
    snapshot.total_value,
    snapshot.total_pnl,
    snapshot.total_pnl_percent,
    snapshot.brier_score,
    snapshot.num_resolved_bets || 0
  );

  return db.prepare(`
    SELECT * FROM portfolio_snapshots
    WHERE agent_id = ? AND snapshot_timestamp = ?
  `).get(snapshot.agent_id, snapshot.snapshot_timestamp) as PortfolioSnapshot;
}

export function getSnapshotsByAgent(agentId: string, limit?: number): PortfolioSnapshot[] {
  const db = getDb();

  if (limit) {
    return db.prepare(`
      SELECT * FROM portfolio_snapshots
      WHERE agent_id = ?
      ORDER BY snapshot_timestamp DESC
      LIMIT ?
    `).all(agentId, limit) as PortfolioSnapshot[];
  }

  return db.prepare(`
    SELECT * FROM portfolio_snapshots
    WHERE agent_id = ?
    ORDER BY snapshot_timestamp ASC
  `).all(agentId) as PortfolioSnapshot[];
}

export function getLatestSnapshot(agentId: string): PortfolioSnapshot | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM portfolio_snapshots
    WHERE agent_id = ?
    ORDER BY snapshot_timestamp DESC
    LIMIT 1
  `).get(agentId) as PortfolioSnapshot | undefined;
}
