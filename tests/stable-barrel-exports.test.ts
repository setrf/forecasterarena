import { describe, expect, it } from 'vitest';
import * as decisionsBarrel from '@/lib/db/queries/decisions';
import * as positionsBarrel from '@/lib/db/queries/positions';
import * as parserBarrel from '@/lib/openrouter/parser';
import * as brierBarrel from '@/lib/scoring/brier';
import * as pnlBarrel from '@/lib/scoring/pnl';
import { claimDecisionForProcessing } from '@/lib/db/queries/decisions/claim';
import {
  getDecisionByAgentWeek,
  getDecisionById,
  getDecisionsByAgent,
  getRecentDecisions,
  getTotalDecisionsForCohort
} from '@/lib/db/queries/decisions/getters';
import {
  createDecision,
  finalizeDecision,
  markDecisionAsError
} from '@/lib/db/queries/decisions/write';
import {
  getAllOpenPositions,
  getClosedPositionsWithMarkets,
  getOpenPositions,
  getPosition,
  getPositionById,
  getPositionsByMarket,
  getPositionsWithMarkets
} from '@/lib/db/queries/positions/read';
import {
  reducePosition,
  settlePosition,
  updatePositionMTM,
  upsertPosition
} from '@/lib/db/queries/positions/write';
import {
  getDefaultHoldDecision,
  isValidDecision,
  parseDecision
} from '@/lib/openrouter/parser/parseDecision';
import {
  calculateAggregateBrier,
  calculateBrierScore,
  calculateBrierSkillScore
} from '@/lib/scoring/brier/score';
import { calculateImpliedConfidence } from '@/lib/scoring/brier/confidence';
import { formatBrierScore, interpretBrierScore } from '@/lib/scoring/brier/display';
import {
  calculatePnLPercent,
  calculateROI,
  calculateTotalPnL,
  calculateTotalValue
} from '@/lib/scoring/pnl/portfolio';
import { calculatePortfolioSummary } from '@/lib/scoring/pnl/summary';
import { formatPercent, formatPnL } from '@/lib/scoring/pnl/format';
import {
  calculatePositionValue,
  calculateRealizedPnL,
  calculateSettlementValue,
  calculateUnrealizedPnL
} from '@/lib/scoring/pnl/values';

describe('stable barrel exports', () => {
  it('keeps the db decision and position barrel paths wired to the underlying modules', () => {
    expect(decisionsBarrel.claimDecisionForProcessing).toBe(claimDecisionForProcessing);
    expect(decisionsBarrel.createDecision).toBe(createDecision);
    expect(decisionsBarrel.finalizeDecision).toBe(finalizeDecision);
    expect(decisionsBarrel.getDecisionByAgentWeek).toBe(getDecisionByAgentWeek);
    expect(decisionsBarrel.getDecisionById).toBe(getDecisionById);
    expect(decisionsBarrel.getDecisionsByAgent).toBe(getDecisionsByAgent);
    expect(decisionsBarrel.getRecentDecisions).toBe(getRecentDecisions);
    expect(decisionsBarrel.getTotalDecisionsForCohort).toBe(getTotalDecisionsForCohort);
    expect(decisionsBarrel.markDecisionAsError).toBe(markDecisionAsError);

    expect(positionsBarrel.getAllOpenPositions).toBe(getAllOpenPositions);
    expect(positionsBarrel.getClosedPositionsWithMarkets).toBe(getClosedPositionsWithMarkets);
    expect(positionsBarrel.getOpenPositions).toBe(getOpenPositions);
    expect(positionsBarrel.getPosition).toBe(getPosition);
    expect(positionsBarrel.getPositionById).toBe(getPositionById);
    expect(positionsBarrel.getPositionsByMarket).toBe(getPositionsByMarket);
    expect(positionsBarrel.getPositionsWithMarkets).toBe(getPositionsWithMarkets);
    expect(positionsBarrel.reducePosition).toBe(reducePosition);
    expect(positionsBarrel.settlePosition).toBe(settlePosition);
    expect(positionsBarrel.updatePositionMTM).toBe(updatePositionMTM);
    expect(positionsBarrel.upsertPosition).toBe(upsertPosition);
  });

  it('preserves the public parser and scoring barrel entrypoints', () => {
    expect(parserBarrel.getDefaultHoldDecision).toBe(getDefaultHoldDecision);
    expect(parserBarrel.isValidDecision).toBe(isValidDecision);
    expect(parserBarrel.parseDecision).toBe(parseDecision);

    expect(brierBarrel.calculateAggregateBrier).toBe(calculateAggregateBrier);
    expect(brierBarrel.calculateBrierScore).toBe(calculateBrierScore);
    expect(brierBarrel.calculateBrierSkillScore).toBe(calculateBrierSkillScore);
    expect(brierBarrel.calculateImpliedConfidence).toBe(calculateImpliedConfidence);
    expect(brierBarrel.formatBrierScore).toBe(formatBrierScore);
    expect(brierBarrel.interpretBrierScore).toBe(interpretBrierScore);

    expect(pnlBarrel.calculatePnLPercent).toBe(calculatePnLPercent);
    expect(pnlBarrel.calculatePortfolioSummary).toBe(calculatePortfolioSummary);
    expect(pnlBarrel.calculatePositionValue).toBe(calculatePositionValue);
    expect(pnlBarrel.calculateRealizedPnL).toBe(calculateRealizedPnL);
    expect(pnlBarrel.calculateROI).toBe(calculateROI);
    expect(pnlBarrel.calculateSettlementValue).toBe(calculateSettlementValue);
    expect(pnlBarrel.calculateTotalPnL).toBe(calculateTotalPnL);
    expect(pnlBarrel.calculateTotalValue).toBe(calculateTotalValue);
    expect(pnlBarrel.calculateUnrealizedPnL).toBe(calculateUnrealizedPnL);
    expect(pnlBarrel.formatPercent).toBe(formatPercent);
    expect(pnlBarrel.formatPnL).toBe(formatPnL);
  });
});
