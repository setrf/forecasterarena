import { describe, expect, it } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';
import { createSingleAgentFixture } from '@/tests/helpers/db-fixtures';

async function withRouteFixture(
  run: (fixture: {
    db: ReturnType<typeof import('@/lib/db')['getDb']>;
    queries: typeof import('@/lib/db/queries');
    route: typeof import('@/app/api/markets/[id]/route');
    cohort: Awaited<ReturnType<typeof createSingleAgentFixture>>['cohort'];
    agent: Awaited<ReturnType<typeof createSingleAgentFixture>>['agent'];
  }) => Promise<void>
) {
  const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

  try {
    const fixture = await createSingleAgentFixture();
    const route = await import('@/app/api/markets/[id]/route');

    await run({
      db: fixture.db,
      queries: fixture.queries,
      route,
      cohort: fixture.cohort,
      agent: fixture.agent
    });
  } finally {
    await ctx.cleanup();
  }
}

describe('market detail route', () => {
  it('links open positions to the opening BUY decision when later trades exist', async () => {
    await withRouteFixture(async ({ agent, cohort, db, queries, route }) => {
      const market = queries.upsertMarket({
        polymarket_id: `pm-opening-${Date.now()}`,
        question: 'Will the opening decision be preserved?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.6,
        volume: 1000,
        liquidity: 500
      });

      const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);
      const openingDecision = queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'buy',
        action: 'BET'
      });
      const laterDecision = queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: 2,
        prompt_system: 'system',
        prompt_user: 'sell',
        action: 'SELL'
      });

      const buyTrade = queries.createTrade({
        agent_id: agent.id,
        market_id: market.id,
        position_id: position.id,
        decision_id: openingDecision.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.5,
        total_amount: 5
      });
      const sellTrade = queries.createTrade({
        agent_id: agent.id,
        market_id: market.id,
        position_id: position.id,
        decision_id: laterDecision.id,
        trade_type: 'SELL',
        side: 'YES',
        shares: 2,
        price: 0.7,
        total_amount: 1.4,
        cost_basis: 1,
        realized_pnl: 0.4
      });

      db.prepare('UPDATE trades SET executed_at = ? WHERE id = ?').run('2025-01-01T00:00:00.000Z', buyTrade.id);
      db.prepare('UPDATE trades SET executed_at = ? WHERE id = ?').run('2025-01-02T00:00:00.000Z', sellTrade.id);

      const response = await route.GET(
        new Request(`http://localhost/api/markets/${market.id}`) as any,
        { params: Promise.resolve({ id: market.id }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.positions).toHaveLength(1);
      expect(data.positions[0].decision_id).toBe(openingDecision.id);
      expect(data.trades[0].decision_id).toBe(laterDecision.id);
    });
  });

  it('falls back to the earliest matching BUY decision when legacy trades omit position_id', async () => {
    await withRouteFixture(async ({ agent, cohort, db, queries, route }) => {
      const market = queries.upsertMarket({
        polymarket_id: `pm-legacy-${Date.now()}`,
        question: 'Will legacy trades still resolve to the opening decision?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.55,
        volume: 1000,
        liquidity: 500
      });

      queries.upsertPosition(agent.id, market.id, 'NO', 8, 0.45, 3.6);
      const openingDecision = queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'buy',
        action: 'BET'
      });

      const buyTrade = queries.createTrade({
        agent_id: agent.id,
        market_id: market.id,
        decision_id: openingDecision.id,
        trade_type: 'BUY',
        side: 'NO',
        shares: 8,
        price: 0.45,
        total_amount: 3.6
      });

      db.prepare('UPDATE trades SET executed_at = ? WHERE id = ?').run('2025-01-01T00:00:00.000Z', buyTrade.id);

      const response = await route.GET(
        new Request(`http://localhost/api/markets/${market.id}`) as any,
        { params: Promise.resolve({ id: market.id }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.positions).toHaveLength(1);
      expect(data.positions[0].decision_id).toBe(openingDecision.id);
    });
  });

  it('excludes archived cohort positions, trades, and Brier rows from current market detail', async () => {
    await withRouteFixture(async ({ agent, cohort, db, queries, route }) => {
      db.prepare(`
        UPDATE cohorts
        SET methodology_version = 'v1', is_archived = 1, archive_reason = 'test archive'
        WHERE id = ?
      `).run(cohort.id);
      const market = queries.upsertMarket({
        polymarket_id: `pm-archived-detail-${Date.now()}`,
        question: 'Will archived market activity stay out of current detail?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.6,
        volume: 1000,
        liquidity: 500
      });
      const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);
      const decision = queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'buy',
        action: 'BET'
      });
      const trade = queries.createTrade({
        agent_id: agent.id,
        market_id: market.id,
        position_id: position.id,
        decision_id: decision.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.5,
        total_amount: 5,
        implied_confidence: 0.5
      });
      queries.createBrierScore({
        agent_id: agent.id,
        trade_id: trade.id,
        market_id: market.id,
        forecast_probability: 0.5,
        actual_outcome: 1,
        brier_score: 0.25
      });

      const response = await route.GET(
        new Request(`http://localhost/api/markets/${market.id}`) as any,
        { params: Promise.resolve({ id: market.id }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.positions).toEqual([]);
      expect(data.trades).toEqual([]);
      expect(data.brier_scores).toEqual([]);
    });
  });
});
