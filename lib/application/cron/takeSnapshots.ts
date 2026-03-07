import { INITIAL_BALANCE } from '@/lib/constants';
import { logSystemEvent } from '@/lib/db';
import {
  createPortfolioSnapshot,
  getActiveCohorts,
  getAgentsByCohort,
  getAllOpenPositions,
  getAverageBrierScore,
  getBrierScoresByAgent,
  getMarketById,
  updatePositionMTM
} from '@/lib/db/queries';
import { calculatePositionValue } from '@/lib/scoring/pnl';
import { nowTimestamp } from '@/lib/utils';
import { resolveSnapshotYesPrice } from '@/lib/application/cron/snapshotPricing';
import { errorMessage, failure, ok, type CronAppResult } from '@/lib/application/cron/types';
import type { Agent, Position } from '@/lib/types';

type SnapshotJobSuccess = {
  success: true;
  snapshots_taken: number;
  positions_updated: number;
  errors: number;
  duration_ms: number;
};

function updateAgentMarkToMarket(agentId: string): { positionsValue: number; positionsUpdated: number } {
  const positions = getAllOpenPositions(agentId);
  let positionsValue = 0;
  let positionsUpdated = 0;

  for (const position of positions) {
    const market = getMarketById(position.market_id);
    if (!market) {
      continue;
    }

    const currentPrice = resolveSnapshotYesPrice(position, market);
    const value = calculatePositionValue(position.shares, position.side, currentPrice);
    const unrealizedPnl = value - position.total_cost;

    updatePositionMTM(position.id, value, unrealizedPnl);
    positionsValue += value;
    positionsUpdated++;
  }

  return { positionsValue, positionsUpdated };
}

function createAgentSnapshot(agent: Agent, snapshotTimestamp: string): { positionsUpdated: number } {
  const { positionsValue, positionsUpdated } = updateAgentMarkToMarket(agent.id);
  const totalValue = agent.cash_balance + positionsValue;
  const totalPnl = totalValue - INITIAL_BALANCE;
  const totalPnlPercent = (totalPnl / INITIAL_BALANCE) * 100;
  const brierScore = getAverageBrierScore(agent.id);
  const brierScores = getBrierScoresByAgent(agent.id);

  createPortfolioSnapshot({
    agent_id: agent.id,
    snapshot_timestamp: snapshotTimestamp,
    cash_balance: agent.cash_balance,
    positions_value: positionsValue,
    total_value: totalValue,
    total_pnl: totalPnl,
    total_pnl_percent: totalPnlPercent,
    brier_score: brierScore ?? undefined,
    num_resolved_bets: brierScores.length
  });

  return { positionsUpdated };
}

export async function takeSnapshots(): Promise<CronAppResult<SnapshotJobSuccess>> {
  try {
    console.log('Taking portfolio snapshots...');

    const startTime = Date.now();
    const snapshotTimestamp = nowTimestamp();
    let snapshotsTaken = 0;
    let positionsUpdated = 0;
    const errors: string[] = [];

    for (const cohort of getActiveCohorts()) {
      for (const agent of getAgentsByCohort(cohort.id)) {
        try {
          const result = createAgentSnapshot(agent, snapshotTimestamp);
          positionsUpdated += result.positionsUpdated;
          snapshotsTaken++;
        } catch (error) {
          errors.push(`Agent ${agent.id}: ${errorMessage(error)}`);
        }
      }
    }

    const duration = Date.now() - startTime;

    logSystemEvent('snapshots_taken', {
      snapshots: snapshotsTaken,
      positions_updated: positionsUpdated,
      errors: errors.length,
      duration_ms: duration
    });

    console.log(
      `Snapshots complete: ${snapshotsTaken} snapshots, ${positionsUpdated} positions updated`
    );

    return ok({
      success: true,
      snapshots_taken: snapshotsTaken,
      positions_updated: positionsUpdated,
      errors: errors.length,
      duration_ms: duration
    });
  } catch (error) {
    const message = errorMessage(error);
    logSystemEvent('take_snapshots_error', { error: message }, 'error');
    return failure(500, message);
  }
}
