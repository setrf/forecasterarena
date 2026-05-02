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
    await withSingleAgentFixture(async ({ queries, agent, cohort, db }) => {
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

      const archivedOnlyMarket = queries.upsertMarket({
        polymarket_id: 'market-list-archived-positioned',
        question: 'Will archived-only activity stay historical?',
        category: 'Politics',
        close_date: '2030-01-15T00:00:00.000Z',
        status: 'active',
        current_price: 0.51,
        volume: 2200
      });
      db.prepare(`
        INSERT INTO cohorts (
          id, cohort_number, started_at, methodology_version, benchmark_config_id, is_archived, archive_reason
        ) VALUES ('archived-market-list-cohort', ?, '2026-01-01T00:00:00.000Z', 'v1', ?, 1, 'test archive')
      `).run(cohort.cohort_number + 1, cohort.benchmark_config_id);
      const [archivedAgent] = queries.createAgentsForCohort('archived-market-list-cohort', cohort.benchmark_config_id);
      queries.upsertPosition(archivedAgent!.id, positionedMarket.id, 'NO', 4, 0.38, 1.52);
      queries.upsertPosition(archivedAgent!.id, archivedOnlyMarket.id, 'YES', 3, 0.51, 1.53);

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
        total_markets: 4,
        active_markets: 3,
        markets_with_positions: 1,
        categories_count: 2
      });
      expect(result.updated_at).toEqual(expect.any(String));

      const archivedOnlyResult = listMarkets({
        status: 'active',
        category: null,
        search: 'archived-only',
        sort: 'volume',
        withCohortBets: true,
        limit: 10,
        offset: 0
      });
      expect(archivedOnlyResult.total).toBe(0);
    });
  });

  it('treats wildcard characters in market search as literals', async () => {
    await withSingleAgentFixture(async ({ queries }) => {
      const literalPercentMarket = queries.upsertMarket({
        polymarket_id: 'market-search-percent-literal',
        question: 'Will inflation exceed 5% this quarter?',
        category: 'Economics',
        close_date: '2030-04-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.58,
        volume: 1400
      });

      queries.upsertMarket({
        polymarket_id: 'market-search-percent-control',
        question: 'Will inflation cool this quarter?',
        category: 'Economics',
        close_date: '2030-04-02T00:00:00.000Z',
        status: 'active',
        current_price: 0.42,
        volume: 900
      });

      const { listMarkets } = await import('@/lib/application/markets');
      const result = listMarkets({
        status: 'active',
        category: null,
        search: '%',
        sort: 'volume',
        withCohortBets: false,
        limit: 10,
        offset: 0
      });

      expect(result.markets).toHaveLength(1);
      expect(result.markets[0]).toMatchObject({
        id: literalPercentMarket.id,
        question: 'Will inflation exceed 5% this quarter?'
      });
    });
  });

  it('uses a deterministic id tiebreaker for paginated market sorting', async () => {
    await withSingleAgentFixture(async ({ db, queries }) => {
      const first = queries.upsertMarket({
        polymarket_id: 'market-order-first',
        question: 'Will the first tied market resolve?',
        category: 'Politics',
        close_date: '2030-05-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.51,
        volume: 1000
      });
      const second = queries.upsertMarket({
        polymarket_id: 'market-order-second',
        question: 'Will the second tied market resolve?',
        category: 'Politics',
        close_date: '2030-05-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.49,
        volume: 1000
      });
      const third = queries.upsertMarket({
        polymarket_id: 'market-order-third',
        question: 'Will the third tied market resolve?',
        category: 'Politics',
        close_date: '2030-05-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.5,
        volume: 1000
      });

      db.prepare('UPDATE markets SET id = ? WHERE id = ?').run('market-a', second.id);
      db.prepare('UPDATE markets SET id = ? WHERE id = ?').run('market-b', third.id);
      db.prepare('UPDATE markets SET id = ? WHERE id = ?').run('market-c', first.id);

      const { listMarkets } = await import('@/lib/application/markets');
      const firstPage = listMarkets({
        status: 'active',
        category: 'Politics',
        search: null,
        sort: 'volume',
        withCohortBets: false,
        limit: 2,
        offset: 0
      });
      const secondPage = listMarkets({
        status: 'active',
        category: 'Politics',
        search: null,
        sort: 'volume',
        withCohortBets: false,
        limit: 2,
        offset: 2
      });

      expect(firstPage.markets.map((market) => market.id)).toEqual(['market-a', 'market-b']);
      expect(secondPage.markets.map((market) => market.id)).toEqual(['market-c']);
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
        family_slug: expect.any(String),
        decision_id: decision.id
      });
      expect(result.data.trades).toHaveLength(1);
      expect(result.data.trades[0]).toMatchObject({
        id: trade.id,
        family_slug: expect.any(String),
        decision_id: decision.id
      });
      expect(result.data.brier_scores).toHaveLength(1);
      expect(result.data.brier_scores[0]).toMatchObject({
        family_slug: expect.any(String),
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
      const recentDecisionTimestamp = new Date(Date.now() + 60_000).toISOString();
      db.prepare(`
        UPDATE decisions
        SET decision_timestamp = ?
        WHERE id = ?
      `).run(recentDecisionTimestamp, decision2.id);

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
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const queries = await import('@/lib/db/queries');
      const dbModule = await import('@/lib/db');
      const db = dbModule.getDb();
      const firstModel = db.prepare(`
        SELECT id FROM models
        ORDER BY id ASC
        LIMIT 1
      `).get() as { id: string };
      const otherModel = db.prepare(`
        SELECT id FROM models
        WHERE id != ?
        ORDER BY id ASC
        LIMIT 1
      `).get(firstModel.id) as { id: string };

      db.prepare(`
        UPDATE models
        SET is_active = CASE WHEN id IN (?, ?) THEN 1 ELSE 0 END
      `).run(firstModel.id, otherModel.id);

      const benchmarkConfig = await createTestBenchmarkConfigForLegacyModels([firstModel.id, otherModel.id]);
      const cohort = queries.createCohort(benchmarkConfig.id);
      const createdAgents = queries.createAgentsForCohort(cohort.id, benchmarkConfig.id);
      const agent = createdAgents.find((candidate) => candidate.model_id === firstModel.id);
      const otherAgent = createdAgents.find((candidate) => candidate.model_id === otherModel.id);

      if (!agent || !otherAgent) {
        throw new Error('Expected both benchmark family agents to exist');
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
      const recentHoldTimestamp = new Date(Date.now() + 60_000).toISOString();
      db.prepare(`
        UPDATE decisions
        SET decision_timestamp = ?
        WHERE id = ?
      `).run(recentHoldTimestamp, holdDecision.id);
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
    } finally {
      await ctx.cleanup();
    }
  });
});
