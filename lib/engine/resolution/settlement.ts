import { logSystemEvent, withTransaction } from '@/lib/db';
import {
  createBrierScore,
  getAgentById,
  getMarketById,
  getMarketByPolymarketId,
  getPositionsByMarket,
  getTradesByMarket,
  resolveMarket,
  settlePosition,
  updateAgentBalance
} from '@/lib/db/queries';
import { calculateBrierScore } from '@/lib/scoring/brier';
import { calculateSettlementValue } from '@/lib/scoring/pnl';
import type { Market, Position } from '@/lib/types';

function settlePositionForMarket(
  position: Position,
  market: Market,
  winningOutcome: string
): void {
  const settlementValue = calculateSettlementValue(position.shares, position.side, winningOutcome);
  const agent = getAgentById(position.agent_id);
  if (!agent) {
    console.error(`Agent not found for position ${position.id}`);
    return;
  }

  const pnl = settlementValue - position.total_cost;

  withTransaction(() => {
    updateAgentBalance(
      position.agent_id,
      agent.cash_balance + settlementValue,
      Math.max(0, agent.total_invested - position.total_cost)
    );
    settlePosition(position.id);
  });

  logSystemEvent('position_settled', {
    position_id: position.id,
    agent_id: position.agent_id,
    market_id: market.id,
    side: position.side,
    winning_outcome: winningOutcome,
    settlement_value: settlementValue,
    cost_basis: position.total_cost,
    pnl
  });

  console.log(
    `Settled position ${position.id}: ` +
    `${position.side} on "${market.question.slice(0, 50)}..." → ` +
    `${winningOutcome} wins, P/L: $${pnl.toFixed(2)}`
  );
}

function recordBrierScoresForMarket(market: Market, winningOutcome: string): number {
  const trades = getTradesByMarket(market.id);
  let recorded = 0;
  let skipped = 0;

  for (const trade of trades) {
    if (trade.trade_type !== 'BUY') {
      continue;
    }

    if (trade.implied_confidence === null || trade.implied_confidence === undefined) {
      skipped++;
      console.warn(
        `[Brier] Skipping trade ${trade.id}: no implied_confidence recorded. ` +
        `Market: "${market.question.slice(0, 40)}..."`
      );
      continue;
    }

    if (trade.implied_confidence < 0 || trade.implied_confidence > 1) {
      skipped++;
      console.warn(
        `[Brier] Skipping trade ${trade.id}: invalid implied_confidence ${trade.implied_confidence}`
      );
      continue;
    }

    createBrierScore({
      agent_id: trade.agent_id,
      trade_id: trade.id,
      market_id: market.id,
      forecast_probability: trade.implied_confidence,
      actual_outcome: trade.side.toUpperCase() === winningOutcome.toUpperCase() ? 1 : 0,
      brier_score: calculateBrierScore(trade.implied_confidence, trade.side, winningOutcome)
    });

    recorded++;
  }

  if (skipped > 0) {
    logSystemEvent('brier_scores_skipped', {
      market_id: market.id,
      skipped_count: skipped,
      recorded_count: recorded
    }, 'warning');
  }

  return recorded;
}

export function processResolvedMarket(
  market: Market,
  winningOutcome: string
): { positions_settled: number; errors: string[] } {
  const positions = getPositionsByMarket(market.id);
  const errors: string[] = [];

  if (positions.length === 0) {
    console.log(`No positions to settle for market ${market.id}`);
    return { positions_settled: 0, errors };
  }

  console.log(`Settling ${positions.length} position(s) for market "${market.question.slice(0, 50)}..."`);

  let positionsSettled = 0;
  for (const position of positions) {
    try {
      settlePositionForMarket(position, market, winningOutcome);
      positionsSettled++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error settling position ${position.id}:`, error);
      errors.push(`Position ${position.id}: ${message}`);
    }
  }

  recordBrierScoresForMarket(market, winningOutcome);
  return { positions_settled: positionsSettled, errors };
}

export function handleCancelledMarket(marketRef: string): number {
  const market = getMarketById(marketRef) ?? getMarketByPolymarketId(marketRef);
  if (!market) {
    return 0;
  }

  const positions = getPositionsByMarket(market.id);
  let refundedCount = 0;

  withTransaction(() => {
    for (const position of positions) {
      const agent = getAgentById(position.agent_id);
      if (!agent) {
        continue;
      }

      updateAgentBalance(
        position.agent_id,
        agent.cash_balance + position.total_cost,
        Math.max(0, agent.total_invested - position.total_cost)
      );
      settlePosition(position.id);
      refundedCount++;
    }

    resolveMarket(market.id, 'CANCELLED');
  });

  for (const position of positions) {
    logSystemEvent('position_refunded', {
      position_id: position.id,
      agent_id: position.agent_id,
      market_id: market.id,
      refund_amount: position.total_cost
    });
  }

  logSystemEvent('market_cancelled', {
    market_id: market.id,
    positions_refunded: refundedCount
  });

  return refundedCount;
}
