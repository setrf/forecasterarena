import { describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

type DbModule = typeof import('@/lib/db');
type AgentsModule = typeof import('@/lib/db/queries/agents');
type CohortsModule = typeof import('@/lib/db/queries/cohorts');
type DecisionsModule = typeof import('@/lib/db/queries/decisions');
type MarketsModule = typeof import('@/lib/db/queries/markets');
type ModelsModule = typeof import('@/lib/db/queries/models');
type PositionsModule = typeof import('@/lib/db/queries/positions');
type SnapshotsModule = typeof import('@/lib/db/queries/snapshots');
type TradesModule = typeof import('@/lib/db/queries/trades');

type MarketUpsertInput = Parameters<MarketsModule['upsertMarket']>[0];

interface LoadedModules {
  agents: AgentsModule;
  cohorts: CohortsModule;
  db: ReturnType<DbModule['getDb']>;
  decisions: DecisionsModule;
  markets: MarketsModule;
  models: ModelsModule;
  positions: PositionsModule;
  snapshots: SnapshotsModule;
  trades: TradesModule;
}

let sequence = 0;

function uniqueId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

async function withModules(run: (modules: LoadedModules) => Promise<void> | void): Promise<void> {
  const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

  try {
    const dbModule = await import('@/lib/db');
    const [
      agents,
      cohorts,
      decisions,
      markets,
      models,
      positions,
      snapshots,
      trades
    ] = await Promise.all([
      import('@/lib/db/queries/agents'),
      import('@/lib/db/queries/cohorts'),
      import('@/lib/db/queries/decisions'),
      import('@/lib/db/queries/markets'),
      import('@/lib/db/queries/models'),
      import('@/lib/db/queries/positions'),
      import('@/lib/db/queries/snapshots'),
      import('@/lib/db/queries/trades')
    ]);

    await run({
      agents,
      cohorts,
      db: dbModule.getDb(),
      decisions,
      markets,
      models,
      positions,
      snapshots,
      trades
    });
  } finally {
    await ctx.cleanup();
  }
}

function createMarket(markets: MarketsModule, overrides: Partial<MarketUpsertInput> = {}) {
  return markets.upsertMarket({
    polymarket_id: uniqueId('pm'),
    question: uniqueId('question'),
    close_date: '2030-01-01T00:00:00.000Z',
    status: 'active',
    current_price: 0.55,
    volume: 1000,
    liquidity: 500,
    ...overrides
  });
}

describe('db query modules - operations', () => {
  it('covers cohort lifecycle and completion status queries', async () => {
    await withModules(({ agents, cohorts, db, decisions, markets, positions }) => {
      expect(cohorts.getLatestCohortNumber()).toBe(0);
      expect(cohorts.getCohortForCurrentWeek()).toBeUndefined();

      const cohortOne = cohorts.createCohort();
      expect(cohorts.createCohort().id).toBe(cohortOne.id);
      db.prepare('UPDATE cohorts SET started_at = ? WHERE id = ?').run('2020-01-01T00:00:00.000Z', cohortOne.id);
      const cohortTwo = cohorts.createCohort();

      expect(cohorts.getLatestCohortNumber()).toBe(2);
      expect(cohorts.getCohortById(cohortOne.id)?.id).toBe(cohortOne.id);
      expect(cohorts.getCohortByNumber(2)?.id).toBe(cohortTwo.id);
      expect(cohorts.getCohortForCurrentWeek()?.id).toBe(cohortTwo.id);
      expect(cohorts.getAllCohorts(1).map(cohort => cohort.id)).toEqual([cohortTwo.id]);
      expect(cohorts.getActiveCohorts().map(cohort => cohort.id)).toEqual([cohortTwo.id, cohortOne.id]);

      const cohortOneAgents = agents.createAgentsForCohort(cohortOne.id);
      const agent = cohortOneAgents[0]!;
      const market = createMarket(markets);
      const position = positions.upsertPosition(agent.id, market.id, 'YES', 5, 0.4, 2);
      decisions.createDecision({
        agent_id: agent.id,
        cohort_id: cohortOne.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET'
      });

      expect(cohorts.getCohortCompletionStatus(cohortOne.id)).toEqual({
        open_positions: 1,
        total_decisions: 1
      });

      expect(position.status).toBe('open');

      cohorts.completeCohort(cohortOne.id);

      const completed = cohorts.getCohortById(cohortOne.id)!;
      expect(completed.status).toBe('completed');
      expect(completed.completed_at).toBeTruthy();
      expect(cohorts.getActiveCohorts().map(cohort => cohort.id)).toEqual([cohortTwo.id]);
    });
  });

  it('covers agent reads, balance updates, and portfolio valuation branches', async () => {
    await withModules(({ agents, cohorts, markets, models, positions }) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const cohort = cohorts.createCohort();
      const createdAgents = agents.createAgentsForCohort(cohort.id);
      const activeModels = models.getActiveModels();
      const agent = createdAgents[0]!;

      expect(models.getModelById(agent.model_id)?.id).toBe(agent.model_id);
      expect(agents.getAgentsByCohort(cohort.id)).toHaveLength(activeModels.length);
      expect(agents.getAgentById(agent.id)?.id).toBe(agent.id);
      expect(agents.getAgentByCohortAndModel(cohort.id, agent.model_id)?.id).toBe(agent.id);

      const agentsWithModels = agents.getAgentsWithModelsByCohort(cohort.id);
      expect(agentsWithModels).toHaveLength(activeModels.length);
      expect(agentsWithModels[0]?.model.id).toBe(agentsWithModels[0]?.model_id);
      expect(agentsWithModels[0]?.model.openrouter_id).toBeTruthy();

      agents.updateAgentBalance(agent.id, 0, 0);
      expect(agents.getAgentById(agent.id)?.status).toBe('bankrupt');

      agents.updateAgentBalance(agent.id, 25, 100);
      expect(agents.getAgentById(agent.id)?.status).toBe('active');
      expect(warnSpy).toHaveBeenCalledTimes(1);

      agents.updateAgentBalance(agent.id, 250, 0);
      expect(agents.getAgentById(agent.id)?.status).toBe('active');
      expect(warnSpy).toHaveBeenCalledTimes(1);

      const market = createMarket(markets);
      const position = positions.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);
      positions.updatePositionMTM(position.id, 12, 7);

      expect(agents.calculateActualPortfolioValue(agent.id)).toBe(262);
      expect(() => agents.calculateActualPortfolioValue('missing-agent')).toThrow('Agent missing-agent not found');

      warnSpy.mockRestore();
    });
  });

  it('covers market inserts, updates, reads, sorting, and resolution transitions', async () => {
    await withModules(({ markets }) => {
      const defaulted = markets.upsertMarket({
        polymarket_id: uniqueId('pm')
      });
      const inserted = markets.upsertMarket({
        polymarket_id: uniqueId('pm'),
        question: 'Inserted market'
      });

      expect(defaulted.question).toBe('');
      expect(inserted.market_type).toBe('binary');
      expect(inserted.status).toBe('active');
      expect(inserted.close_date).toBeTruthy();

      const updated = markets.upsertMarket({
        polymarket_id: inserted.polymarket_id,
        volume: 2500,
        status: 'closed',
        question: undefined
      });

      const activeHighVolume = createMarket(markets, {
        question: 'High volume active',
        volume: 5000
      });
      const activeLowVolume = createMarket(markets, {
        question: 'Low volume active',
        volume: 100
      });
      const closedMarket = createMarket(markets, {
        question: 'Closed market',
        status: 'closed',
        volume: 750
      });

      expect(updated.question).toBe('Inserted market');
      expect(updated.volume).toBe(2500);
      expect(markets.getMarketById(inserted.id)?.id).toBe(inserted.id);
      expect(markets.getMarketByPolymarketId(inserted.polymarket_id)?.id).toBe(inserted.id);
      expect(markets.getAllMarkets(2).map(market => market.question)).toEqual([
        'High volume active',
        'Inserted market'
      ]);
      expect(markets.getActiveMarkets(10).map(market => market.question)).toEqual([
        'High volume active',
        'Low volume active',
        ''
      ]);
      expect(markets.getTopMarketsByVolume(1).map(market => market.id)).toEqual([activeHighVolume.id]);
      expect(markets.getClosedMarkets().map(market => market.id)).toEqual([closedMarket.id, inserted.id]);

      markets.resolveMarket(activeLowVolume.id, 'YES');

      const resolved = markets.getMarketById(activeLowVolume.id)!;
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolution_outcome).toBe('YES');
      expect(resolved.resolved_at).toBeTruthy();
    });
  });

  it('covers decision queries for default and explicit retry counts', async () => {
    await withModules(({ agents, cohorts, db, decisions }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);

      const older = decisions.createDecision({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'ERROR'
      });

      const newer = decisions.createDecision({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 2,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'HOLD',
        retry_count: 2
      });

      db.prepare('UPDATE decisions SET decision_timestamp = ? WHERE id = ?').run(
        '2025-01-01T00:00:00.000Z',
        older.id
      );
      db.prepare('UPDATE decisions SET decision_timestamp = ? WHERE id = ?').run(
        '2025-01-01T00:00:01.000Z',
        newer.id
      );

      expect(older.retry_count).toBe(0);
      expect(newer.retry_count).toBe(2);
      expect(decisions.getDecisionByAgentWeek(agent!.id, cohort.id, 1)?.id).toBe(older.id);
      expect(decisions.getDecisionByAgentWeek(agent!.id, cohort.id, 2)?.id).toBe(newer.id);
      expect(decisions.getDecisionsByAgent(agent!.id).map(decision => decision.id)).toEqual([newer.id, older.id]);
      expect(decisions.getDecisionsByAgent(agent!.id, 1).map(decision => decision.id)).toEqual([newer.id]);
      expect(decisions.getRecentDecisions(1).map(decision => decision.id)).toEqual([newer.id]);
      expect(decisions.getTotalDecisionsForCohort(cohort.id)).toBe(2);
    });
  });

  it('covers in-progress decision claims and error finalization defaults', async () => {
    await withModules(({ agents, cohorts, decisions }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);

      const inProgress = decisions.createDecision({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'ERROR',
        error_message: '__IN_PROGRESS__'
      });

      const skippedClaim = decisions.claimDecisionForProcessing({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 1,
        stale_after_ms: 60_000
      });

      expect(skippedClaim).toMatchObject({
        status: 'skipped',
        decision: {
          id: inProgress.id,
          error_message: '__IN_PROGRESS__'
        }
      });

      const failed = decisions.createDecision({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 2,
        prompt_system: 'original-system',
        prompt_user: 'original-user',
        action: 'BET'
      });

      const errored = decisions.markDecisionAsError(failed.id, 'request failed');

      expect(errored).toMatchObject({
        id: failed.id,
        action: 'ERROR',
        prompt_system: '__IN_PROGRESS__',
        prompt_user: '__IN_PROGRESS__',
        error_message: 'request failed'
      });
    });
  });

  it('covers claimed retry paths for stale in-progress and trade-less actionable decisions', async () => {
    await withModules(({ agents, cohorts, db, decisions }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);

      const actionableWithoutTrades = decisions.createDecision({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET',
        reasoning: 'initial reasoning'
      });

      const retriedActionable = decisions.claimDecisionForProcessing({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 1,
        stale_after_ms: 60_000
      });

      expect(retriedActionable).toMatchObject({
        status: 'claimed',
        retryReason: 'Retrying decision because no trades were recorded',
        decision: {
          id: actionableWithoutTrades.id,
          prompt_system: '__IN_PROGRESS__',
          prompt_user: '__IN_PROGRESS__',
          reasoning: 'Retrying decision because no trades were recorded',
          error_message: '__IN_PROGRESS__'
        }
      });

      const staleInProgress = decisions.createDecision({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 2,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'ERROR',
        reasoning: 'stalled reasoning',
        error_message: '__IN_PROGRESS__'
      });

      db.prepare('UPDATE decisions SET decision_timestamp = ? WHERE id = ?').run(
        '2020-01-01T00:00:00.000Z',
        staleInProgress.id
      );

      const retriedStale = decisions.claimDecisionForProcessing({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 2,
        stale_after_ms: 1_000
      });

      expect(retriedStale).toMatchObject({
        status: 'claimed',
        retryReason: 'Retrying stale in-progress decision',
        decision: {
          id: staleInProgress.id,
          prompt_system: '__IN_PROGRESS__',
          prompt_user: '__IN_PROGRESS__',
          reasoning: 'stalled reasoning',
          error_message: '__IN_PROGRESS__'
        }
      });

      const retryableError = decisions.createDecision({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 3,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'ERROR',
        reasoning: 'previous error reasoning',
        error_message: 'request timed out'
      });

      const reclaimedError = decisions.claimDecisionForProcessing({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 3,
        stale_after_ms: 60_000
      });

      expect(reclaimedError.status).toBe('claimed');
      expect(reclaimedError.retryReason).toBeUndefined();
      expect(reclaimedError.decision).toMatchObject({
        id: retryableError.id,
        prompt_system: '__IN_PROGRESS__',
        prompt_user: '__IN_PROGRESS__',
        reasoning: 'previous error reasoning',
        error_message: '__IN_PROGRESS__'
      });
    });
  });

  it('covers trade queries with and without limits', async () => {
    await withModules(({ agents, cohorts, db, decisions, markets, positions, trades }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);
      const market = createMarket(markets);
      const decision = decisions.createDecision({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET'
      });
      const position = positions.upsertPosition(agent!.id, market.id, 'YES', 10, 0.6, 6);

      const buy = trades.createTrade({
        agent_id: agent!.id,
        market_id: market.id,
        position_id: position.id,
        decision_id: decision.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.6,
        total_amount: 6
      });

      const sell = trades.createTrade({
        agent_id: agent!.id,
        market_id: market.id,
        decision_id: decision.id,
        position_id: position.id,
        trade_type: 'SELL',
        side: 'YES',
        shares: 4,
        price: 0.8,
        total_amount: 3.2,
        cost_basis: 2.4,
        realized_pnl: 0.8
      });

      db.prepare('UPDATE trades SET executed_at = ? WHERE id = ?').run('2025-01-01T00:00:00.000Z', buy.id);
      db.prepare('UPDATE trades SET executed_at = ? WHERE id = ?').run('2025-01-01T00:00:01.000Z', sell.id);

      expect(trades.getTradesByAgent(agent!.id).map(trade => trade.id)).toEqual([sell.id, buy.id]);
      expect(trades.getTradesByAgent(agent!.id, 1).map(trade => trade.id)).toEqual([sell.id]);
      expect(trades.getTradesByMarket(market.id).map(trade => trade.id)).toEqual([sell.id, buy.id]);
      expect(trades.getTradesByDecision(decision.id).map(trade => trade.id)).toEqual([buy.id, sell.id]);
    });
  });

  it('covers position queries, update paths, and reduction edge cases', async () => {
    await withModules(({ agents, cohorts, db, decisions, markets, positions, trades }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);
      const decision = decisions.createDecision({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET'
      });

      const activeMarket = createMarket(markets, {
        question: 'Active market'
      });
      const closedMarket = createMarket(markets, {
        question: 'Closed market',
        status: 'closed'
      });

      const openPosition = positions.upsertPosition(agent!.id, activeMarket.id, 'YES', 10, 0.4, 4);
      const mergedPosition = positions.upsertPosition(agent!.id, activeMarket.id, 'YES', 5, 0.8, 4);
      const closedMarketPosition = positions.upsertPosition(agent!.id, closedMarket.id, 'NO', 8, 0.3, 2.4);
      const nullCurrentValueMergeMarket = createMarket(markets, {
        question: 'Null current value merge market'
      });
      const nullCurrentValueReduceMarket = createMarket(markets, {
        question: 'Null current value reduce market'
      });
      const nullCurrentValueMergePosition = positions.upsertPosition(
        agent!.id,
        nullCurrentValueMergeMarket.id,
        'YES',
        4,
        0.5,
        2
      );
      const nullCurrentValueReducePosition = positions.upsertPosition(
        agent!.id,
        nullCurrentValueReduceMarket.id,
        'NO',
        10,
        0.3,
        3
      );

      expect(mergedPosition.shares).toBe(15);
      expect(mergedPosition.avg_entry_price).toBeCloseTo(8 / 15, 10);
      expect(positions.getPositionById(openPosition.id)?.id).toBe(openPosition.id);
      expect(positions.getPosition(agent!.id, activeMarket.id, 'YES')?.id).toBe(openPosition.id);
      expect(
        positions.getAllOpenPositions(agent!.id).map(position => position.market_id).sort()
      ).toEqual(
        [
          activeMarket.id,
          closedMarket.id,
          nullCurrentValueMergeMarket.id,
          nullCurrentValueReduceMarket.id
        ].sort()
      );
      expect(positions.getOpenPositions(agent!.id).map(position => position.market_id).sort()).toEqual(
        [activeMarket.id, nullCurrentValueMergeMarket.id, nullCurrentValueReduceMarket.id].sort()
      );

      positions.updatePositionMTM(openPosition.id, 11, 3);

      trades.createTrade({
        agent_id: agent!.id,
        market_id: activeMarket.id,
        position_id: openPosition.id,
        decision_id: decision.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.4,
        total_amount: 4
      });

      expect(positions.getPositionsWithMarkets(agent!.id)[0]).toMatchObject({
        id: openPosition.id,
        market_question: 'Active market',
        opening_decision_id: decision.id
      });
      expect(positions.getPositionsByMarket(activeMarket.id).map(position => position.id)).toEqual([openPosition.id]);
      expect(() => positions.upsertPosition(agent!.id, activeMarket.id, 'YES', -15, 0.2, -3)).toThrow(
        'Cannot calculate avg price: newShares is 0'
      );

      db.prepare('UPDATE positions SET current_value = NULL WHERE id = ?').run(nullCurrentValueMergePosition.id);
      const mergedWithFallbackCurrentValue = positions.upsertPosition(
        agent!.id,
        nullCurrentValueMergeMarket.id,
        'YES',
        2,
        0.25,
        0.5
      );
      expect(mergedWithFallbackCurrentValue).toMatchObject({
        id: nullCurrentValueMergePosition.id,
        shares: 6,
        total_cost: 2.5,
        current_value: 2.5,
        unrealized_pnl: 0
      });

      positions.reducePosition('missing-position', 1);
      positions.reducePosition(openPosition.id, 5);
      expect(positions.getPositionById(openPosition.id)?.shares).toBe(10);
      expect(positions.getPositionById(openPosition.id)?.total_cost).toBeCloseTo(8 * (10 / 15), 10);

      db.prepare('UPDATE positions SET current_value = NULL WHERE id = ?').run(nullCurrentValueReducePosition.id);
      positions.reducePosition(nullCurrentValueReducePosition.id, 4);
      const reducedWithFallbackCurrentValue = positions.getPositionById(nullCurrentValueReducePosition.id)!;
      expect(reducedWithFallbackCurrentValue.id).toBe(nullCurrentValueReducePosition.id);
      expect(reducedWithFallbackCurrentValue.shares).toBe(6);
      expect(reducedWithFallbackCurrentValue.total_cost).toBeCloseTo(1.8, 10);
      expect(reducedWithFallbackCurrentValue.current_value).toBeCloseTo(1.8, 10);
      expect(reducedWithFallbackCurrentValue.unrealized_pnl).toBeCloseTo(0, 10);

      positions.reducePosition(closedMarketPosition.id, 8);
      expect(positions.getPositionById(closedMarketPosition.id)?.status).toBe('closed');

      const invalidPosition = positions.upsertPosition(agent!.id, createMarket(markets).id, 'A', 2, 0.5, 1);
      db.prepare("UPDATE positions SET shares = 0 WHERE id = ?").run(invalidPosition.id);
      expect(() => positions.reducePosition(invalidPosition.id, 1)).toThrow(
        `Cannot reduce position ${invalidPosition.id}: shares is 0`
      );

      positions.settlePosition(openPosition.id);
      const settled = positions.getPositionById(openPosition.id)!;
      expect(settled.status).toBe('settled');
      expect(settled.current_value).toBe(0);
      expect(settled.unrealized_pnl).toBe(0);
    });
  });

  it('returns closed and resolved position history with market metadata', async () => {
    await withModules(({ agents, cohorts, db, decisions, markets, positions, trades }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);
      const decision = decisions.createDecision({
        agent_id: agent!.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET'
      });

      const exitedMarket = createMarket(markets, {
        question: 'Exited market',
        status: 'active'
      });
      const cancelledMarket = createMarket(markets, {
        question: 'Cancelled market',
        status: 'resolved'
      });
      const wonMarket = createMarket(markets, {
        question: 'Won market',
        status: 'resolved'
      });
      const pendingMarket = createMarket(markets, {
        question: 'Pending market',
        status: 'closed'
      });
      const unknownMarket = createMarket(markets, {
        question: 'Unknown market',
        status: 'resolved'
      });

      const exitedPosition = positions.upsertPosition(agent!.id, exitedMarket.id, 'YES', 5, 0.4, 2);
      const cancelledPosition = positions.upsertPosition(agent!.id, cancelledMarket.id, 'YES', 3, 0.3, 0.9);
      const wonPosition = positions.upsertPosition(agent!.id, wonMarket.id, 'YES', 4, 0.25, 1);
      const pendingPosition = positions.upsertPosition(agent!.id, pendingMarket.id, 'NO', 6, 0.2, 1.2);
      const unknownPosition = positions.upsertPosition(agent!.id, unknownMarket.id, 'MAYBE', 2, 0.5, 1);

      trades.createTrade({
        agent_id: agent!.id,
        market_id: exitedMarket.id,
        position_id: exitedPosition.id,
        decision_id: decision.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 5,
        price: 0.4,
        total_amount: 2
      });
      trades.createTrade({
        agent_id: agent!.id,
        market_id: exitedMarket.id,
        position_id: exitedPosition.id,
        decision_id: decision.id,
        trade_type: 'SELL',
        side: 'YES',
        shares: 5,
        price: 0.7,
        total_amount: 3.5,
        cost_basis: 2,
        realized_pnl: 1.5
      });

      positions.reducePosition(exitedPosition.id, 5);
      positions.settlePosition(cancelledPosition.id);
      positions.settlePosition(wonPosition.id);
      db.prepare(
        'UPDATE markets SET resolution_outcome = ?, resolved_at = ?, status = ? WHERE id = ?'
      ).run('CANCELLED', '2030-02-01T00:00:00.000Z', 'resolved', cancelledMarket.id);
      db.prepare(
        'UPDATE markets SET resolution_outcome = ?, resolved_at = ?, status = ? WHERE id = ?'
      ).run('YES', '2030-02-01T00:00:00.000Z', 'resolved', wonMarket.id);
      db.prepare(
        'UPDATE markets SET resolution_outcome = ?, resolved_at = ?, status = ? WHERE id = ?'
      ).run('NO', '2030-02-01T00:00:00.000Z', 'resolved', unknownMarket.id);

      const history = positions.getClosedPositionsWithMarkets(agent!.id);

      const byQuestion = Object.fromEntries(
        history.map(entry => [entry.market_question, entry])
      ) as Record<string, any>;

      expect(byQuestion['Exited market']).toMatchObject({
        outcome: 'EXITED',
        settlement_value: 3.5,
        pnl: 1.5,
        opening_decision_id: decision.id
      });
      expect(byQuestion['Cancelled market']).toMatchObject({
        outcome: 'CANCELLED',
        settlement_value: 0.9,
        pnl: 0
      });
      expect(byQuestion['Won market']).toMatchObject({
        outcome: 'WON',
        settlement_value: 4,
        pnl: 3
      });
      expect(byQuestion['Pending market']).toMatchObject({
        outcome: 'PENDING',
        settlement_value: null,
        pnl: null
      });
      expect(byQuestion['Unknown market']).toMatchObject({
        outcome: 'UNKNOWN',
        settlement_value: null,
        pnl: null
      });

      expect(history).toHaveLength(5);
      expect(pendingPosition.status).toBe('open');
      expect(unknownPosition.status).toBe('open');
    });
  });

  it('covers snapshot upserts and ordering modes', async () => {
    await withModules(({ agents, cohorts, snapshots }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);

      const first = snapshots.createPortfolioSnapshot({
        agent_id: agent!.id,
        snapshot_timestamp: '2025-01-01T00:00:00.000Z',
        cash_balance: 100,
        positions_value: 10,
        total_value: 110,
        total_pnl: 10,
        total_pnl_percent: 10
      });

      const second = snapshots.createPortfolioSnapshot({
        agent_id: agent!.id,
        snapshot_timestamp: '2025-01-02T00:00:00.000Z',
        cash_balance: 120,
        positions_value: 30,
        total_value: 150,
        total_pnl: 50,
        total_pnl_percent: 50,
        brier_score: 0.12,
        num_resolved_bets: 3
      });

      const updated = snapshots.createPortfolioSnapshot({
        agent_id: agent!.id,
        snapshot_timestamp: '2025-01-01T00:00:00.000Z',
        cash_balance: 90,
        positions_value: 20,
        total_value: 110,
        total_pnl: 10,
        total_pnl_percent: 10,
        num_resolved_bets: 1
      });

      expect(first.num_resolved_bets).toBe(0);
      expect(second.num_resolved_bets).toBe(3);
      expect(updated.id).toBe(first.id);
      expect(updated.cash_balance).toBe(90);
      expect(updated.num_resolved_bets).toBe(1);
      expect(snapshots.getSnapshotsByAgent(agent!.id).map(snapshot => snapshot.snapshot_timestamp)).toEqual([
        '2025-01-01T00:00:00.000Z',
        '2025-01-02T00:00:00.000Z'
      ]);
      expect(snapshots.getSnapshotsByAgent(agent!.id, 1).map(snapshot => snapshot.snapshot_timestamp)).toEqual([
        '2025-01-02T00:00:00.000Z'
      ]);
      expect(snapshots.getLatestSnapshot(agent!.id)?.snapshot_timestamp).toBe('2025-01-02T00:00:00.000Z');
    });
  });
});
