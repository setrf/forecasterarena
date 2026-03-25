import { describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

describe('engine/cohort', () => {
  it('creates a cohort and agents when forced', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    try {
      const cohortEngine = await import('@/lib/engine/cohort');
      const result = cohortEngine.maybeStartNewCohort(true);

      expect(result.success).toBe(true);
      expect(result.cohort).toBeDefined();
      expect(result.agents?.length).toBeGreaterThan(0);
    } finally {
      await ctx.cleanup();
    }
  });

  it('is idempotent within the same week', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    try {
      const cohortEngine = await import('@/lib/engine/cohort');
      const first = cohortEngine.maybeStartNewCohort(true);
      const second = cohortEngine.maybeStartNewCohort(true);

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      expect(first.cohort?.id).toBe(second.cohort?.id);
    } finally {
      await ctx.cleanup();
    }
  });

  it('does not start when outside Sunday window unless forced', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T12:00:00.000Z')); // Wednesday

    try {
      const cohortEngine = await import('@/lib/engine/cohort');
      const result = cohortEngine.maybeStartNewCohort(false);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Not Sunday|outside start window/i);
    } finally {
      await ctx.cleanup();
    }
  });

  it('reports actual trade count in cohort stats instead of decision count', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    try {
      const cohortEngine = await import('@/lib/engine/cohort');
      const queries = await import('@/lib/db/queries');

      const started = cohortEngine.maybeStartNewCohort(true);
      const cohort = started.cohort!;
      const agent = started.agents![0]!;

      const market = queries.upsertMarket({
        polymarket_id: 'cohort-stats-market',
        question: 'Will cohort stats count trades?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.55,
        volume: 1000
      });

      const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);

      const decisionOne = queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET'
      });
      const decisionTwo = queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: 2,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'HOLD'
      });

      queries.createTrade({
        agent_id: agent.id,
        market_id: market.id,
        position_id: position.id,
        decision_id: decisionOne.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.5,
        total_amount: 5
      });

      const stats = cohortEngine.getCohortStats(cohort.id);

      expect(decisionTwo.id).toBeDefined();
      expect(stats).toMatchObject({
        cohort_id: cohort.id,
        num_agents: started.agents!.length,
        active_agents: started.agents!.length,
        open_positions: 1,
        total_trades: 1
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('uses an immediate transaction when starting a cohort', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const withImmediateTransaction = vi.fn((fn: () => unknown) => fn());

    vi.doMock('@/lib/db/transactions', () => ({
      withTransaction: vi.fn((fn: () => unknown) => fn()),
      withImmediateTransaction
    }));

    try {
      const startModule = await import('@/lib/engine/cohort/start');
      const result = startModule.startNewCohort();

      expect(result.success).toBe(true);
      expect(withImmediateTransaction).toHaveBeenCalled();
    } finally {
      vi.doUnmock('@/lib/db/transactions');
      await ctx.cleanup();
    }
  });
});
