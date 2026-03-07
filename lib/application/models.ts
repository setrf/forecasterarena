import { INITIAL_BALANCE } from '@/lib/constants';
import { getDb } from '@/lib/db';
import {
  calculateActualPortfolioValue,
  getAverageBrierScore,
  getModelById,
  getSnapshotsByAgent
} from '@/lib/db/queries';

interface AgentWithCohort {
  id: string;
  cohort_id: string;
  model_id: string;
  cash_balance: number;
  total_invested: number;
  status: string;
  created_at: string;
  cohort_number: number;
  cohort_started_at: string;
  cohort_status: string;
}

export interface ModelDetailPayload {
  model: NonNullable<ReturnType<typeof getModelById>>;
  num_cohorts: number;
  total_pnl: number;
  avg_pnl_percent: number;
  avg_brier_score: number | null;
  win_rate: number | null;
  cohort_performance: Array<{
    cohort_id: string;
    cohort_number: number;
    cohort_status: string;
    agent_status: string;
    cash_balance: number;
    total_value: number;
    total_pnl: number;
    total_pnl_percent: number;
    brier_score: number | null;
    num_resolved_bets: number;
  }>;
  recent_decisions: Array<Record<string, unknown>>;
  equity_curve: Array<{
    snapshot_timestamp: string;
    total_value: number;
  }>;
  updated_at: string;
}

type NotFoundResult = {
  status: 'not_found';
  error: 'Model not found';
};

type OkResult<T> = {
  status: 'ok';
  data: T;
};

export function getModelDetail(
  modelId: string
): OkResult<ModelDetailPayload> | NotFoundResult {
  const model = getModelById(modelId);

  if (!model) {
    return { status: 'not_found', error: 'Model not found' };
  }

  const db = getDb();
  const agents = db.prepare(`
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

  const cohortPerformance = agents.map((agent) => {
    const snapshots = getSnapshotsByAgent(agent.id);
    const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const brierScore = getAverageBrierScore(agent.id);
    const totalValue = latestSnapshot?.total_value ?? calculateActualPortfolioValue(agent.id);
    const totalPnl = latestSnapshot?.total_pnl ?? (totalValue - INITIAL_BALANCE);
    const totalPnlPercent = latestSnapshot?.total_pnl_percent ?? ((totalPnl / INITIAL_BALANCE) * 100);

    return {
      cohort_id: agent.cohort_id,
      cohort_number: agent.cohort_number,
      cohort_status: agent.cohort_status,
      agent_status: agent.status,
      cash_balance: agent.cash_balance,
      total_value: totalValue,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent,
      brier_score: brierScore,
      num_resolved_bets: latestSnapshot?.num_resolved_bets ?? 0
    };
  });

  const totalPnl = cohortPerformance.reduce((sum, cohort) => sum + cohort.total_pnl, 0);
  const totalCapital = cohortPerformance.length * INITIAL_BALANCE;
  const avgPnlPercent = totalCapital > 0 ? (totalPnl / totalCapital) * 100 : 0;

  const brierScores = cohortPerformance
    .map((cohort) => cohort.brier_score)
    .filter((score): score is number => score !== null);
  const avgBrierScore = brierScores.length > 0
    ? brierScores.reduce((sum, score) => sum + score, 0) / brierScores.length
    : null;

  const winRateResult = db.prepare(`
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

  const winRate = winRateResult && winRateResult.total > 0
    ? winRateResult.wins / winRateResult.total
    : null;

  const recentDecisions = db.prepare(`
    SELECT d.*, c.cohort_number
    FROM decisions d
    JOIN agents a ON d.agent_id = a.id
    JOIN cohorts c ON d.cohort_id = c.id
    WHERE a.model_id = ?
    ORDER BY d.decision_timestamp DESC
    LIMIT 20
  `).all(modelId) as Array<Record<string, unknown>>;

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

  const equityCurve = Array.from(snapshotsByTime.entries()).map(([timestamp, values]) => ({
    snapshot_timestamp: timestamp,
    total_value: values.reduce((sum, value) => sum + value, 0) / values.length
  }));

  return {
    status: 'ok',
    data: {
      model,
      num_cohorts: agents.length,
      total_pnl: totalPnl,
      avg_pnl_percent: avgPnlPercent,
      avg_brier_score: avgBrierScore,
      win_rate: winRate,
      cohort_performance: cohortPerformance,
      recent_decisions: recentDecisions,
      equity_curve: equityCurve,
      updated_at: new Date().toISOString()
    }
  };
}
