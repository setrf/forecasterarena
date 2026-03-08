import { describe, expect, it } from 'vitest';
import { createSingleAgentFixture } from '@/tests/helpers/db-fixtures';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

async function withModelRoute(
  run: (fixture: {
    db: ReturnType<typeof import('@/lib/db')['getDb']>;
    queries: typeof import('@/lib/db/queries');
    route: typeof import('@/app/api/models/[id]/route');
    cohort: Awaited<ReturnType<typeof createSingleAgentFixture>>['cohort'];
    agent: Awaited<ReturnType<typeof createSingleAgentFixture>>['agent'];
    legacyModelId: string;
  }) => Promise<void>
) {
  const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

  try {
    const fixture = await createSingleAgentFixture();
    const route = await import('@/app/api/models/[id]/route');

    await run({
      db: fixture.db,
      queries: fixture.queries,
      route,
      cohort: fixture.cohort,
      agent: fixture.agent,
      legacyModelId: fixture.legacyModelId
    });
  } finally {
    await ctx.cleanup();
  }
}

describe('model route', () => {
  it('returns model detail with aggregate stats, decisions, and equity curve', async () => {
    await withModelRoute(async ({ db, queries, route, cohort, agent, legacyModelId }) => {
      const family = db.prepare(`
        SELECT slug
        FROM model_families
        WHERE legacy_model_id = ?
      `).get(legacyModelId) as { slug: string };
      const market = queries.upsertMarket({
        polymarket_id: 'resolved-market',
        question: 'Will the route return model detail?',
        status: 'active',
        current_price: 0.7,
        volume: 1000,
        liquidity: 500,
        close_date: '2030-01-01T00:00:00.000Z'
      });
      queries.resolveMarket(market.id, 'YES');
      const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.6, 6);
      const decision = queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET',
        reasoning: 'Take the YES side.'
      });
      const trade = queries.createTrade({
        agent_id: agent.id,
        market_id: market.id,
        position_id: position.id,
        decision_id: decision.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.6,
        total_amount: 6
      });

      queries.createBrierScore({
        agent_id: agent.id,
        trade_id: trade.id,
        market_id: market.id,
        forecast_probability: 0.6,
        actual_outcome: 1,
        brier_score: 0.16
      });

      queries.createPortfolioSnapshot({
        agent_id: agent.id,
        snapshot_timestamp: '2025-01-01T00:00:00.000Z',
        cash_balance: 9994,
        positions_value: 12,
        total_value: 10006,
        total_pnl: 6,
        total_pnl_percent: 0.06,
        brier_score: 0.16,
        num_resolved_bets: 1
      });
      queries.createPortfolioSnapshot({
        agent_id: agent.id,
        snapshot_timestamp: '2025-01-08T00:00:00.000Z',
        cash_balance: 9994,
        positions_value: 26,
        total_value: 10020,
        total_pnl: 20,
        total_pnl_percent: 0.2,
        brier_score: 0.16,
        num_resolved_bets: 1
      });

      const response = await route.GET(
        new Request(`http://localhost/api/models/${legacyModelId}`) as any,
        { params: Promise.resolve({ id: legacyModelId }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.model.id).toBe(family.slug);
      expect(data.model.legacy_model_id).toBe(legacyModelId);
      expect(data.num_cohorts).toBe(1);
      expect(data.total_pnl).toBe(20);
      expect(data.avg_pnl_percent).toBeCloseTo(0.2, 10);
      expect(data.avg_brier_score).toBeCloseTo(0.16, 10);
      expect(data.win_rate).toBe(1);
      expect(data.cohort_performance).toMatchObject([{
        cohort_id: cohort.id,
        total_value: 10020,
        total_pnl: 20,
        num_resolved_bets: 1
      }]);
      expect(data.recent_decisions).toMatchObject([{
        id: decision.id,
        cohort_number: cohort.cohort_number
      }]);
      expect(data.equity_curve).toEqual([
        { snapshot_timestamp: '2025-01-01T00:00:00.000Z', total_value: 10006 },
        { snapshot_timestamp: '2025-01-08T00:00:00.000Z', total_value: 10020 }
      ]);
      expect(data.updated_at).toBeTypeOf('string');
    });
  });

  it('falls back to live portfolio value when no snapshots exist yet', async () => {
    await withModelRoute(async ({ db, queries, route, agent, legacyModelId }) => {
      const market = queries.upsertMarket({
        polymarket_id: 'active-market',
        question: 'Will fallback valuation be used?',
        status: 'active',
        current_price: 0.5,
        volume: 500,
        liquidity: 250,
        close_date: '2030-01-01T00:00:00.000Z'
      });
      const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);

      queries.updateAgentBalance(agent.id, 9995, 5);
      queries.updatePositionMTM(position.id, 12, 7);

      const response = await route.GET(
        new Request(`http://localhost/api/models/${legacyModelId}`) as any,
        { params: Promise.resolve({ id: legacyModelId }) }
      );
      const data = await response.json();
      const family = db.prepare(`
        SELECT slug
        FROM model_families
        WHERE legacy_model_id = ?
      `).get(legacyModelId) as { slug: string };
      const cohortPerformance = data.cohort_performance[0];

      expect(response.status).toBe(200);
      expect(data.model.id).toBe(family.slug);
      expect(cohortPerformance.total_value).toBe(10007);
      expect(cohortPerformance.total_pnl).toBe(7);
      expect(cohortPerformance.total_pnl_percent).toBeCloseTo(0.07, 10);
      expect(data.total_pnl).toBe(7);
      expect(data.avg_pnl_percent).toBeCloseTo(0.07, 10);
      expect(data.equity_curve).toEqual([]);
    });
  });

  it('returns 404 for a missing model', async () => {
    await withModelRoute(async ({ route }) => {
      const response = await route.GET(
        new Request('http://localhost/api/models/missing') as any,
        { params: Promise.resolve({ id: 'missing' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Model not found');
    });
  });
});
