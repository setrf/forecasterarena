import { logSystemEvent } from '@/lib/db';
import { createBrierScore, getTradesByMarket } from '@/lib/db/queries';
import { calculateBrierScore } from '@/lib/scoring/brier';
import type { Market } from '@/lib/types';

export function recordBrierScoresForMarket(
  market: Market,
  winningOutcome: string
): number {
  const trades = getTradesByMarket(market.id);
  let recorded = 0;
  let skipped = 0;

  for (const trade of trades) {
    if (trade.trade_type !== 'BUY') {
      continue;
    }

    if (trade.implied_confidence === null || trade.implied_confidence === undefined) {
      skipped += 1;
      console.warn(
        `[Brier] Skipping trade ${trade.id}: no implied_confidence recorded. ` +
        `Market: "${market.question.slice(0, 40)}..."`
      );
      continue;
    }

    if (trade.implied_confidence < 0 || trade.implied_confidence > 1) {
      skipped += 1;
      console.warn(
        `[Brier] Skipping trade ${trade.id}: invalid implied_confidence ${trade.implied_confidence}`
      );
      continue;
    }

    createBrierScore({
      agent_id: trade.agent_id,
      trade_id: trade.id,
      market_id: market.id,
      family_id: trade.family_id,
      release_id: trade.release_id,
      benchmark_config_model_id: trade.benchmark_config_model_id,
      forecast_probability: trade.implied_confidence,
      actual_outcome: trade.side.toUpperCase() === winningOutcome.toUpperCase() ? 1 : 0,
      brier_score: calculateBrierScore(
        trade.implied_confidence,
        trade.side,
        winningOutcome
      )
    });

    recorded += 1;
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
