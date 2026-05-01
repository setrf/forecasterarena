import { describe, expect, it } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';
import { withDbQueryModules } from '@/tests/helpers/db-query-test-utils';

describe('db query modules - decision and trade operations', () => {
  it('covers decision queries for default and explicit retry counts', async () => {
    await withDbQueryModules(({ agents, cohorts, db, decisions }) => {
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

  it('keeps archived cohort decisions out of the public recent decision feed', async () => {
    await withDbQueryModules(async ({ agents, cohorts, db, decisions }) => {
      const { listRecentDecisions } = await import('@/lib/application/decisions');
      const archivedCohort = cohorts.createCohort();
      db.prepare('UPDATE cohorts SET started_at = ?, is_archived = 1 WHERE id = ?')
        .run('2026-01-04T00:00:00.000Z', archivedCohort.id);
      const currentCohort = cohorts.createCohort();
      const [archivedAgent] = agents.createAgentsForCohort(archivedCohort.id);
      const [currentAgent] = agents.createAgentsForCohort(currentCohort.id);

      const archivedDecision = decisions.createDecision({
        agent_id: archivedAgent!.id,
        cohort_id: archivedCohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'HOLD'
      });
      const currentDecision = decisions.createDecision({
        agent_id: currentAgent!.id,
        cohort_id: currentCohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'HOLD'
      });
      db.prepare('UPDATE decisions SET decision_timestamp = ? WHERE id = ?')
        .run('2026-01-05T00:00:00.000Z', archivedDecision.id);
      db.prepare('UPDATE decisions SET decision_timestamp = ? WHERE id = ?')
        .run('2026-01-12T00:00:00.000Z', currentDecision.id);

      expect(listRecentDecisions(10).decisions.map((decision) => decision.id)).toEqual([
        currentDecision.id
      ]);
    });
  });

  it('covers in-progress decision claims and error finalization defaults', async () => {
    await withDbQueryModules(({ agents, cohorts, decisions }) => {
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
    await withDbQueryModules(({ agents, cohorts, db, decisions }) => {
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
    await withDbQueryModules(({ agents, cohorts, db, decisions, markets, positions, trades }) => {
      const cohort = cohorts.createCohort();
      const [agent] = agents.createAgentsForCohort(cohort.id);
      const market = markets.upsertMarket({
        polymarket_id: 'pm-trades',
        question: 'Trades market',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.55,
        volume: 1000,
        liquidity: 500
      });
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

  it('throws when decision lineage is requested for an agent missing frozen benchmark metadata', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const { getDecisionLineageSnapshot } = await import('@/lib/db/queries/decisions/lineage');
      const missingAgentId = 'missing-agent';

      expect(() => getDecisionLineageSnapshot(missingAgentId)).toThrow(
        `Agent ${missingAgentId} is missing frozen benchmark lineage`
      );
    } finally {
      await ctx.cleanup();
    }
  });
});
