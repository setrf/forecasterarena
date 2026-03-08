import { describe, expect, it, vi } from 'vitest';
import {
  createSingleAgentFixture,
  createTestBenchmarkConfigForLegacyModels
} from '@/tests/helpers/db-fixtures';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

type SingleAgentFixture = Awaited<ReturnType<typeof createSingleAgentFixture>>;

async function withSingleAgentFixture(
  run: (fixture: SingleAgentFixture) => Promise<void>
): Promise<void> {
  const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

  try {
    const fixture = await createSingleAgentFixture();
    await run(fixture);
  } finally {
    await ctx.cleanup();
  }
}

describe('markets application', () => {
  it('lists markets with filters, categories, stats, and preserved payload fields', async () => {
    await withSingleAgentFixture(async ({ queries, agent }) => {
      const positionedMarket = queries.upsertMarket({
        polymarket_id: 'market-list-positioned',
        question: 'Will the election settle this year?',
        category: 'Politics',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.62,
        volume: 3200
      });
      queries.upsertPosition(agent.id, positionedMarket.id, 'YES', 10, 0.62, 6.2);

      queries.upsertMarket({
        polymarket_id: 'market-list-active',
        question: 'Will the economy expand next quarter?',
        category: 'Politics',
        close_date: '2030-02-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.55,
        volume: 1200
      });

      queries.upsertMarket({
        polymarket_id: 'market-list-closed',
        question: 'Will the finals go seven games?',
        category: 'Sports',
        close_date: '2030-03-01T00:00:00.000Z',
        status: 'closed',
        current_price: 0.4,
        volume: 900
      });

      const { listMarkets } = await import('@/lib/application/markets');
      const result = listMarkets({
        status: 'active',
        category: 'Politics',
        search: 'election',
        sort: 'volume',
        withCohortBets: true,
        limit: 10,
        offset: 0
      });

      expect(result.total).toBe(1);
      expect(result.has_more).toBe(false);
      expect(result.markets).toHaveLength(1);
      expect(result.markets[0]).toMatchObject({
        id: positionedMarket.id,
        question: 'Will the election settle this year?',
        positions_count: 1
      });
      expect(result.categories).toEqual(['Politics', 'Sports']);
      expect(result.stats).toEqual({
        total_markets: 3,
        active_markets: 2,
        markets_with_positions: 1,
        categories_count: 2
      });
      expect(result.updated_at).toEqual(expect.any(String));
    });
  });

  it('returns market detail and keeps the not-found contract intact', async () => {
    await withSingleAgentFixture(async ({ queries, agent, cohort }) => {
      const market = queries.upsertMarket({
        polymarket_id: 'market-detail-resolved',
        question: 'Will the detail query preserve related records?',
        category: 'Politics',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.55,
        volume: 1500
      });
      const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.55, 5.5);
      const decision = queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET',
        reasoning: 'Take the trade'
      });
      const trade = queries.createTrade({
        agent_id: agent.id,
        market_id: market.id,
        position_id: position.id,
        decision_id: decision.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.55,
        total_amount: 5.5,
        implied_confidence: 0.55
      });
      queries.resolveMarket(market.id, 'YES');
      queries.createBrierScore({
        agent_id: agent.id,
        trade_id: trade.id,
        market_id: market.id,
        forecast_probability: 0.55,
        actual_outcome: 1,
        brier_score: 0.2025
      });

      const { getMarketDetail } = await import('@/lib/application/markets');

      expect(getMarketDetail('missing')).toEqual({
        status: 'not_found',
        error: 'Market not found'
      });

      const result = getMarketDetail(market.id);
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') {
        throw new Error('Expected market detail result');
      }

      expect(result.data.market.id).toBe(market.id);
      expect(result.data.positions).toHaveLength(1);
      expect(result.data.positions[0]).toMatchObject({
        agent_id: agent.id,
        decision_id: decision.id
      });
      expect(result.data.trades).toHaveLength(1);
      expect(result.data.trades[0]).toMatchObject({
        id: trade.id,
        decision_id: decision.id
      });
      expect(result.data.brier_scores).toHaveLength(1);
      expect(result.data.brier_scores[0]).toMatchObject({
        trade_id: trade.id,
        brier_score: 0.2025
      });
      expect(result.data.updated_at).toEqual(expect.any(String));
    });
  });
});

describe('models application', () => {
  it('aggregates model detail across cohorts without changing the response shape', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const queries = await import('@/lib/db/queries');
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      const firstModel = db.prepare(`
        SELECT id FROM models
        ORDER BY id ASC
        LIMIT 1
      `).get() as { id: string };

      db.prepare(`
        UPDATE models
        SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END
      `).run(firstModel.id);

      const benchmarkConfig = await createTestBenchmarkConfigForLegacyModels([firstModel.id]);

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-02T12:00:00.000Z'));
      const cohort1 = queries.createCohort(benchmarkConfig.id);
      const [agent1] = queries.createAgentsForCohort(cohort1.id, benchmarkConfig.id);

      vi.setSystemTime(new Date('2026-03-09T12:00:00.000Z'));
      const cohort2 = queries.createCohort(benchmarkConfig.id);
      const [agent2] = queries.createAgentsForCohort(cohort2.id, benchmarkConfig.id);
      vi.useRealTimers();

      const market1 = queries.upsertMarket({
        polymarket_id: 'model-detail-market-1',
        question: 'Will the first cohort win?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.6,
        volume: 1000
      });
      const position1 = queries.upsertPosition(agent1.id, market1.id, 'YES', 10, 0.6, 6);
      const decision1 = queries.createDecision({
        agent_id: agent1.id,
        cohort_id: cohort1.id,
        decision_week: 1,
        prompt_system: 'system-1',
        prompt_user: 'user-1',
        action: 'BET',
        reasoning: 'First cohort trade'
      });
      const trade1 = queries.createTrade({
        agent_id: agent1.id,
        market_id: market1.id,
        position_id: position1.id,
        decision_id: decision1.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.6,
        total_amount: 6,
        implied_confidence: 0.6
      });
      queries.resolveMarket(market1.id, 'YES');
      queries.createBrierScore({
        agent_id: agent1.id,
        trade_id: trade1.id,
        market_id: market1.id,
        forecast_probability: 0.6,
        actual_outcome: 1,
        brier_score: 0.16
      });
      queries.createPortfolioSnapshot({
        agent_id: agent1.id,
        snapshot_timestamp: '2026-03-10 00:00:00',
        cash_balance: 10100,
        positions_value: 0,
        total_value: 10100,
        total_pnl: 100,
        total_pnl_percent: 1,
        brier_score: 0.16,
        num_resolved_bets: 1
      });
      db.prepare(`
        UPDATE decisions
        SET decision_timestamp = ?
        WHERE id = ?
      `).run('2026-03-10T00:00:00.000Z', decision1.id);

      const market2 = queries.upsertMarket({
        polymarket_id: 'model-detail-market-2',
        question: 'Will the second cohort win?',
        close_date: '2030-02-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.4,
        volume: 900
      });
      const position2 = queries.upsertPosition(agent2.id, market2.id, 'YES', 10, 0.4, 4);
      const decision2 = queries.createDecision({
        agent_id: agent2.id,
        cohort_id: cohort2.id,
        decision_week: 1,
        prompt_system: 'system-2',
        prompt_user: 'user-2',
        action: 'BET',
        reasoning: 'Second cohort trade'
      });
      const trade2 = queries.createTrade({
        agent_id: agent2.id,
        market_id: market2.id,
        position_id: position2.id,
        decision_id: decision2.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.4,
        total_amount: 4,
        implied_confidence: 0.4
      });
      queries.resolveMarket(market2.id, 'YES');
      queries.createBrierScore({
        agent_id: agent2.id,
        trade_id: trade2.id,
        market_id: market2.id,
        forecast_probability: 0.4,
        actual_outcome: 1,
        brier_score: 0.36
      });
      queries.createPortfolioSnapshot({
        agent_id: agent2.id,
        snapshot_timestamp: '2026-03-10 00:00:00',
        cash_balance: 9900,
        positions_value: 0,
        total_value: 9900,
        total_pnl: -100,
        total_pnl_percent: -1,
        brier_score: 0.36,
        num_resolved_bets: 1
      });
      db.prepare(`
        UPDATE decisions
        SET decision_timestamp = ?
        WHERE id = ?
      `).run('2026-03-11T00:00:00.000Z', decision2.id);

      const { getModelDetail } = await import('@/lib/application/models');
      const family = db.prepare(`
        SELECT slug
        FROM model_families
        WHERE legacy_model_id = ?
      `).get(firstModel.id) as { slug: string };

      expect(getModelDetail('missing')).toEqual({
        status: 'not_found',
        error: 'Model not found'
      });

      const result = getModelDetail(firstModel.id);
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') {
        throw new Error('Expected model detail result');
      }

      expect(result.data.model.id).toBe(family.slug);
      expect(result.data.model.legacy_model_id).toBe(firstModel.id);
      expect(result.data.num_cohorts).toBe(2);
      expect(result.data.total_pnl).toBe(0);
      expect(result.data.avg_pnl_percent).toBe(0);
      expect(result.data.avg_brier_score).toBeCloseTo(0.26);
      expect(result.data.win_rate).toBe(1);
      expect(result.data.cohort_performance).toHaveLength(2);
      expect(result.data.recent_decisions).toHaveLength(2);
      expect((result.data.recent_decisions[0] as { id: string }).id).toBe(decision2.id);
      expect(result.data.equity_curve).toEqual([
        {
          snapshot_timestamp: '2026-03-10 00:00:00',
          total_value: 10000
        }
      ]);
      expect(result.data.updated_at).toEqual(expect.any(String));
    } finally {
      await ctx.cleanup();
    }
  });
});

describe('cohort shared application queries', () => {
  it('keeps agent and cohort helper exports working through the preserved shared import path', async () => {
    await withSingleAgentFixture(async ({ db, queries, cohort, agent, modelId }) => {
      const otherModel = db.prepare(`
        SELECT id FROM models
        WHERE id != ?
        ORDER BY id ASC
        LIMIT 1
      `).get(modelId) as { id: string };

      db.prepare(`
        UPDATE models
        SET is_active = 1
        WHERE id = ?
      `).run(otherModel.id);

      const expandedConfig = await createTestBenchmarkConfigForLegacyModels([modelId, otherModel.id]);
      const otherAgent = queries.createAgentsForCohort(cohort.id, expandedConfig.id)
        .find((candidate) => candidate.model_id === otherModel.id);

      if (!otherAgent) {
        throw new Error('Expected second agent to be created');
      }

      const activeMarket = queries.upsertMarket({
        polymarket_id: 'cohort-shared-active-market',
        question: 'Will the active position stay open?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.7,
        volume: 800
      });
      queries.upsertPosition(agent.id, activeMarket.id, 'YES', 10, 0.7, 7);

      const resolvedMarket = queries.upsertMarket({
        polymarket_id: 'cohort-shared-resolved-market',
        question: 'Will the decision trade resolve correctly?',
        close_date: '2030-02-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.65,
        volume: 900
      });
      const decision = queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET',
        reasoning: 'Shared query coverage'
      });
      queries.createTrade({
        agent_id: agent.id,
        market_id: resolvedMarket.id,
        decision_id: decision.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.65,
        total_amount: 6.5,
        implied_confidence: 0.65
      });
      const holdDecision = queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: 2,
        prompt_system: 'system-hold',
        prompt_user: 'user-hold',
        action: 'HOLD',
        reasoning: 'No trade this week'
      });
      db.prepare(`
        UPDATE decisions
        SET decision_timestamp = ?
        WHERE id = ?
      `).run('2026-03-11T00:00:00.000Z', holdDecision.id);
      queries.resolveMarket(resolvedMarket.id, 'YES');

      queries.createPortfolioSnapshot({
        agent_id: agent.id,
        snapshot_timestamp: '2026-03-10 00:00:00',
        cash_balance: 10100,
        positions_value: 0,
        total_value: 10100,
        total_pnl: 100,
        total_pnl_percent: 1,
        num_resolved_bets: 1
      });
      queries.createPortfolioSnapshot({
        agent_id: otherAgent.id,
        snapshot_timestamp: '2026-03-10 00:00:00',
        cash_balance: 9900,
        positions_value: 0,
        total_value: 9900,
        total_pnl: -100,
        total_pnl_percent: -1,
        num_resolved_bets: 0
      });

      const shared = await import('@/lib/application/cohorts/shared');

      expect(shared.getAgentOpenPositionCount(db, agent.id)).toBe(1);
      expect(shared.getAgentTradeCount(db, agent.id)).toBe(1);
      expect(shared.getCohortTradeCount(db, cohort.id)).toBe(1);
      expect(shared.getCohortOpenPositionCount(db, cohort.id)).toBe(1);
      expect(shared.getCohortMarketsWithPositionsCount(db, cohort.id)).toBe(1);
      expect(shared.getCohortMarketCount(db, cohort.id)).toBe(1);
      expect(shared.getAgentRank(db, cohort.id, 10100)).toEqual({
        rank: 1,
        total_agents: 2
      });
      expect(shared.getAgentWinRate(db, agent.id)).toEqual({
        wins: 1,
        total: 1
      });
      expect(shared.getCohortPnlStats(db, cohort.id)).toMatchObject({
        avg_pnl_percent: 0,
        best_pnl_percent: 1,
        worst_pnl_percent: -1
      });

      const recentDecisions = shared.getRecentCohortDecisions(db, cohort.id);
      expect(recentDecisions).toHaveLength(2);
      expect(recentDecisions[0]).toMatchObject({
        id: holdDecision.id,
        action: 'HOLD',
        model_display_name: expect.any(String)
      });
      expect(recentDecisions[1]).toMatchObject({
        id: decision.id,
        model_display_name: expect.any(String)
      });

      const agentDecisions = shared.getAgentDecisionsWithMarkets(db, agent.id);
      expect(agentDecisions).toHaveLength(2);
      expect(agentDecisions[0]).toMatchObject({
        id: holdDecision.id,
        reasoning: 'No trade this week',
        markets: []
      });
      expect(agentDecisions[1]).toMatchObject({
        id: decision.id,
        reasoning: 'Shared query coverage'
      });
      expect(agentDecisions[1].markets).toEqual([
        expect.objectContaining({
          market_id: resolvedMarket.id,
          market_question: 'Will the decision trade resolve correctly?'
        })
      ]);

      const agentTrades = shared.getAgentTrades(db, agent.id);
      expect(agentTrades).toHaveLength(1);
      expect(agentTrades[0]).toMatchObject({
        decision_id: decision.id,
        market_id: resolvedMarket.id
      });
    });
  });
});
