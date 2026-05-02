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
  upsertMarketPriceSnapshot,
  updatePositionMTM
} from '@/lib/db/queries';
import { calculatePositionValue } from '@/lib/scoring/pnl';
import { nowTimestamp } from '@/lib/utils';
import { refreshPersistedPerformanceCache } from '@/lib/application/performance';
import { resolveValidatedSnapshotYesPrice } from '@/lib/application/cron/snapshotPricing';
import { errorMessage, failure, ok, type CronAppResult } from '@/lib/application/cron/types';
import { getValidatedMarketPrices, type ValidatedMarketPrice } from '@/lib/pricing/marketPrices';
import type { Agent, Market } from '@/lib/types';

type SnapshotJobSuccess = {
  success: true;
  snapshots_taken: number;
  positions_updated: number;
  errors: number;
  duration_ms: number;
};

function recordMarketPriceSnapshot(
  market: Market,
  snapshotTimestamp: string,
  validatedPrice: ValidatedMarketPrice | undefined
): void {
  upsertMarketPriceSnapshot({
    market_id: market.id,
    snapshot_timestamp: snapshotTimestamp,
    source: validatedPrice?.source ?? 'fallback',
    accepted_price: validatedPrice?.source === 'clob' ? validatedPrice.yesPrice ?? null : null,
    accepted_prices: validatedPrice?.source === 'clob' && validatedPrice.outcomePrices
      ? JSON.stringify(validatedPrice.outcomePrices)
      : null,
    gamma_price: market.current_price,
    gamma_prices: market.current_prices,
    clob_token_ids: validatedPrice?.clobTokenIds ?? market.clob_token_ids,
    validation_status: validatedPrice?.validationStatus ?? 'fallback',
    anomaly_reason: validatedPrice?.anomalyReason ?? null
  });

  if (validatedPrice?.anomalyReason) {
    logSystemEvent('price_validation_anomaly', {
      market_id: market.id,
      polymarket_id: market.polymarket_id,
      snapshot_timestamp: snapshotTimestamp,
      source: validatedPrice.source,
      status: validatedPrice.validationStatus,
      reason: validatedPrice.anomalyReason
    }, validatedPrice.source === 'fallback' ? 'warning' : 'info');
  }
}

function updateAgentMarkToMarket(
  agentId: string,
  marketPrices: Map<string, ValidatedMarketPrice>
): { positionsValue: number; positionsUpdated: number } {
  const positions = getAllOpenPositions(agentId);
  let positionsValue = 0;
  let positionsUpdated = 0;

  for (const position of positions) {
    const market = getMarketById(position.market_id);
    if (!market) {
      continue;
    }

    const currentPrice = resolveValidatedSnapshotYesPrice(
      position,
      market,
      marketPrices.get(market.id)
    );
    const value = calculatePositionValue(position.shares, position.side, currentPrice);
    const unrealizedPnl = value - position.total_cost;

    updatePositionMTM(position.id, value, unrealizedPnl);
    positionsValue += value;
    positionsUpdated++;
  }

  return { positionsValue, positionsUpdated };
}

function createAgentSnapshot(
  agent: Agent,
  snapshotTimestamp: string,
  marketPrices: Map<string, ValidatedMarketPrice>
): { positionsUpdated: number } {
  const { positionsValue, positionsUpdated } = updateAgentMarkToMarket(agent.id, marketPrices);
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
    const activeAgents = getActiveCohorts().flatMap((cohort) => getAgentsByCohort(cohort.id));
    const marketsById = new Map<string, Market>();

    for (const agent of activeAgents) {
      for (const position of getAllOpenPositions(agent.id)) {
        const market = getMarketById(position.market_id);
        if (market) {
          marketsById.set(market.id, market);
        }
      }
    }

    const marketPrices = await getValidatedMarketPrices(Array.from(marketsById.values()));

    for (const market of Array.from(marketsById.values())) {
      recordMarketPriceSnapshot(market, snapshotTimestamp, marketPrices.get(market.id));
    }

    for (const agent of activeAgents) {
      try {
        const result = createAgentSnapshot(agent, snapshotTimestamp, marketPrices);
        positionsUpdated += result.positionsUpdated;
        snapshotsTaken++;
      } catch (error) {
        errors.push(`Agent ${agent.id}: ${errorMessage(error)}`);
      }
    }

    refreshPersistedPerformanceCache();

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
