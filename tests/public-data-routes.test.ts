import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

afterEach(() => {
  vi.doUnmock('@/lib/application/leaderboard');
  vi.resetModules();
});

describe('public data routes', () => {
  it('adapts leaderboard application data into a no-store response', async () => {
    const payload = {
      leaderboard: [{ model_id: 'model-1', total_pnl: 123 }],
      cohorts: [{ id: 'cohort-1', cohort_number: 1 }],
      updated_at: '2026-03-06T00:00:00.000Z'
    };

    vi.doMock('@/lib/application/leaderboard', () => ({
      getLeaderboardData: () => payload
    }));

    const route = await import('@/app/api/leaderboard/route');
    const response = await route.GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual(payload);
  });

  it('marks leaderboard responses as no-store', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const queries = await import('@/lib/db/queries');
      const route = await import('@/app/api/leaderboard/route');

      const cohort = queries.createCohort();
      queries.createAgentsForCohort(cohort.id);

      const response = await route.GET();
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
    } finally {
      await ctx.cleanup();
    }
  });

  it('marks mutable market and performance responses as no-store', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const queries = await import('@/lib/db/queries');
      const marketsRoute = await import('@/app/api/markets/route');
      const performanceRoute = await import('@/app/api/performance-data/route');

      const cohort = queries.createCohort();
      const [agent] = queries.createAgentsForCohort(cohort.id);
      const market = queries.upsertMarket({
        polymarket_id: 'pm-no-store-1',
        question: 'Will cache headers stay fresh?',
        market_type: 'binary',
        close_date: '2099-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.55,
        volume: 123_456
      });

      queries.createPortfolioSnapshot({
        agent_id: agent.id,
        snapshot_timestamp: '2026-03-05T12:00:00.000Z',
        cash_balance: 10_000,
        positions_value: 0,
        total_value: 10_000,
        total_pnl: 0,
        total_pnl_percent: 0
      });

      const marketsResponse = await marketsRoute.GET(
        new Request('http://localhost/api/markets?limit=1') as any
      );
      const marketsBody = await marketsResponse.json();
      expect(marketsResponse.status).toBe(200);
      expect(marketsResponse.headers.get('cache-control')).toBe('no-store');
      expect(marketsBody.markets[0].id).toBe(market.id);

      const performanceResponse = await performanceRoute.GET(
        new Request('http://localhost/api/performance-data?range=1D') as any
      );
      expect(performanceResponse.status).toBe(200);
      expect(performanceResponse.headers.get('cache-control')).toBe('no-store');
    } finally {
      await ctx.cleanup();
    }
  });
});
