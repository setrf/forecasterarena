import { INITIAL_BALANCE } from '@/lib/constants';
import { createPortfolioSnapshot } from '@/lib/db/queries/snapshots';
import { getAverageBrierScore, getBrierScoresByAgent } from '@/lib/db/queries/brier-scores';
import { getAllOpenPositions } from '@/lib/db/queries/positions/read';
import { getMarketById } from '@/lib/db/queries/markets';
import { updatePositionMTM } from '@/lib/db/queries/positions/write';
import { calculatePositionValue } from '@/lib/scoring/pnl';
import { resolveValidatedSnapshotYesPrice } from '@/lib/application/cron/snapshotPricing';
import type { ValidatedMarketPrice } from '@/lib/pricing/marketPrices';
import type { Agent, Market, Position } from '@/lib/types';

type PositionWithMarket = {
  position: Position;
  market: Market;
};

export type SnapshotPortfolioInputs = {
  marketsById: Map<string, Market>;
  positionsByAgentId: Map<string, PositionWithMarket[]>;
};

export function collectSnapshotPortfolioInputs(agents: Agent[]): SnapshotPortfolioInputs {
  const marketsById = new Map<string, Market>();
  const positionsByAgentId = new Map<string, PositionWithMarket[]>();

  for (const agent of agents) {
    const positionsWithMarkets: PositionWithMarket[] = [];

    for (const position of getAllOpenPositions(agent.id)) {
      const market = getMarketById(position.market_id);
      if (!market) {
        continue;
      }

      marketsById.set(market.id, market);
      positionsWithMarkets.push({ position, market });
    }

    positionsByAgentId.set(agent.id, positionsWithMarkets);
  }

  return { marketsById, positionsByAgentId };
}

function updateAgentMarkToMarket(
  positionsWithMarkets: PositionWithMarket[],
  marketPrices: Map<string, ValidatedMarketPrice>
): { positionsValue: number; positionsUpdated: number } {
  let positionsValue = 0;
  let positionsUpdated = 0;

  for (const { position, market } of positionsWithMarkets) {
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

export function createAgentPortfolioSnapshot(
  agent: Agent,
  snapshotTimestamp: string,
  positionsWithMarkets: PositionWithMarket[],
  marketPrices: Map<string, ValidatedMarketPrice>
): { positionsUpdated: number } {
  const { positionsValue, positionsUpdated } = updateAgentMarkToMarket(
    positionsWithMarkets,
    marketPrices
  );
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
