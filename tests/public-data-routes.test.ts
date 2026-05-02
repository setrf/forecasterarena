import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSingleAgentFixture } from '@/tests/helpers/db-fixtures';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

afterEach(() => {
  vi.doUnmock('@/lib/application/leaderboard');
  vi.resetModules();
});

describe('public data routes', () => {
  it('adapts leaderboard application data into a no-store response', async () => {
    const payload = {
      leaderboard: [{ family_slug: 'family-1', total_pnl: 123 }],
      models: [],
      cohorts: [
        {
          id: 'cohort-1',
          cohort_number: 1,
          decision_eligible: true,
          decision_status: 'decisioning'
        }
      ],
      updated_at: '2026-03-06T00:00:00.000Z'
    };

    vi.doMock('@/lib/application/leaderboard', () => ({
      getLeaderboardData: () => payload
    }));

    const route = await import('@/app/api/leaderboard/route');
    const response = await route.GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=15, stale-while-revalidate=45');
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
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('public, max-age=15, stale-while-revalidate=45');
      expect(body.cohorts[0]).toMatchObject({
        decision_eligible: true,
        decision_status: 'decisioning'
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('marks mutable market responses as no-store and chart responses as cacheable', async () => {
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
      expect(performanceResponse.headers.get('cache-control')).toBe('public, max-age=60, stale-while-revalidate=600');
      expect(performanceResponse.headers.get('server-timing')).toContain('cache;desc=');
    } finally {
      await ctx.cleanup();
    }
  });

  it('redacts prompts, raw responses, costs, tokens, and internal errors from public decision detail', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const fixture = await createSingleAgentFixture();
      const route = await import('@/app/api/decisions/[id]/route');

      const market = fixture.queries.upsertMarket({
        polymarket_id: 'pm-public-decision-redaction',
        question: 'Will public decision detail stay safe?',
        market_type: 'binary',
        close_date: '2099-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.55,
        volume: 123_456
      });
      const position = fixture.queries.upsertPosition(fixture.agent.id, market.id, 'YES', 10, 0.55, 5.5);
      const decision = fixture.queries.createDecision({
        agent_id: fixture.agent.id,
        cohort_id: fixture.cohort.id,
        decision_week: 1,
        prompt_system: 'secret system prompt',
        prompt_user: 'secret user prompt',
        raw_response: '{"secret":true}',
        action: 'BET',
        reasoning: 'Public reasoning is allowed.',
        tokens_input: 123,
        tokens_output: 45,
        api_cost_usd: 0.67,
        error_message: 'provider stack trace'
      });
      fixture.queries.createTrade({
        agent_id: fixture.agent.id,
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

      const response = await route.GET(
        new Request(`http://localhost/api/decisions/${decision.id}`) as any,
        { params: Promise.resolve({ id: decision.id }) }
      );
      const body = await response.json();
      const serialized = JSON.stringify(body);

      expect(response.status).toBe(200);
      expect(body.decision).toMatchObject({
        id: decision.id,
        action: 'BET',
        reasoning: 'Public reasoning is allowed.'
      });
      expect(body.trades[0]).toMatchObject({
        trade_type: 'BUY',
        side: 'YES',
        market_question: 'Will public decision detail stay safe?'
      });
      for (const forbidden of [
        'prompt_system',
        'prompt_user',
        'raw_response',
        'tokens_input',
        'tokens_output',
        'api_cost_usd',
        'error_message',
        'secret system prompt',
        'provider stack trace'
      ]) {
        expect(serialized).not.toContain(forbidden);
      }
    } finally {
      await ctx.cleanup();
    }
  });
});
