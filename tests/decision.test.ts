import { describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

type QueryModule = typeof import('@/lib/db/queries');
type DbModule = typeof import('@/lib/db');

let marketCounter = 0;
function nextMarketId() {
  marketCounter += 1;
  return `pm-decision-${Date.now()}-${marketCounter}`;
}

function response(content: string) {
  return {
    content,
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150
    },
    model: 'mock-model',
    finish_reason: 'stop',
    response_time_ms: 25
  };
}

async function createSingleAgentFixture() {
  const queries = await import('@/lib/db/queries');
  const dbModule = await import('@/lib/db');
  const db = dbModule.getDb();

  const firstModel = db.prepare(`
    SELECT id FROM models
    ORDER BY id ASC
    LIMIT 1
  `).get() as { id: string };
  db.prepare(`
    UPDATE models
    SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END
  `).run(firstModel.id);

  const cohort = queries.createCohort();
  const [agent] = queries.createAgentsForCohort(cohort.id);

  return { queries, dbModule, db, cohort, agent };
}

describe('engine/decision', () => {
  it('skips processing when a non-error decision already exists for the same week', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const callOpenRouterWithRetry = vi.fn().mockResolvedValue(
      response(
        JSON.stringify({
          action: 'HOLD',
          reasoning: 'Should not be used'
        })
      )
    );

    vi.doMock('@/lib/openrouter/client', () => ({
      callOpenRouterWithRetry,
      estimateCost: vi.fn(() => 0.001)
    }));

    try {
      const { queries, cohort, agent } = await createSingleAgentFixture();
      const { calculateWeekNumber } = await import('@/lib/utils');
      const week = calculateWeekNumber(cohort.started_at);

      const existing = queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: week,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'HOLD',
        reasoning: 'Already decided'
      });

      const decisionEngine = await import('@/lib/engine/decision');
      const result = await decisionEngine.runCohortDecisions(cohort.id);

      expect(callOpenRouterWithRetry).not.toHaveBeenCalled();
      expect(result.agents_processed).toBe(1);
      expect(result.decisions).toHaveLength(1);
      expect(result.decisions[0].action).toBe('SKIPPED');
      expect(result.decisions[0].decision_id).toBe(existing.id);
      expect(result.decisions[0].success).toBe(true);
    } finally {
      vi.doUnmock('@/lib/openrouter/client');
      await ctx.cleanup();
    }
  });

  it('uses side-correct current price for NO positions in the prompt', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const callOpenRouterWithRetry = vi.fn().mockResolvedValue(
      response(
        JSON.stringify({
          action: 'HOLD',
          reasoning: 'No trade'
        })
      )
    );

    vi.doMock('@/lib/openrouter/client', () => ({
      callOpenRouterWithRetry,
      estimateCost: vi.fn(() => 0.001)
    }));

    try {
      const { queries, cohort, agent } = await createSingleAgentFixture();
      const market = queries.upsertMarket({
        polymarket_id: nextMarketId(),
        question: 'Will conversion to side-correct NO price work?',
        market_type: 'binary',
        status: 'active',
        current_price: 0.2,
        close_date: '2099-01-01T00:00:00.000Z',
        volume: 10_000
      });

      queries.upsertPosition(agent.id, market.id, 'NO', 10, 0.8, 8);

      const decisionEngine = await import('@/lib/engine/decision');
      await decisionEngine.runCohortDecisions(cohort.id);

      expect(callOpenRouterWithRetry).toHaveBeenCalledTimes(1);
      const userPrompt = callOpenRouterWithRetry.mock.calls[0][2] as string;
      expect(userPrompt).toContain('Side: NO');
      expect(userPrompt).toContain('Current: 80.0%');
    } finally {
      vi.doUnmock('@/lib/openrouter/client');
      await ctx.cleanup();
    }
  });

  it('retries malformed model output up to configured retry limit', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    vi.doMock('@/lib/constants', async () => {
      const actual = await vi.importActual<typeof import('@/lib/constants')>('@/lib/constants');
      return {
        ...actual,
        LLM_MAX_RETRIES: 2
      };
    });

    const callOpenRouterWithRetry = vi
      .fn()
      .mockResolvedValueOnce(response('not-json-1'))
      .mockResolvedValueOnce(response('not-json-2'))
      .mockResolvedValueOnce(
        response(
          JSON.stringify({
            action: 'HOLD',
            reasoning: 'Valid after retries'
          })
        )
      );

    vi.doMock('@/lib/openrouter/client', () => ({
      callOpenRouterWithRetry,
      estimateCost: vi.fn(() => 0.001)
    }));

    try {
      const { queries, cohort, agent } = await createSingleAgentFixture();
      queries.upsertMarket({
        polymarket_id: nextMarketId(),
        question: 'Will retry loop continue past first retry?',
        market_type: 'binary',
        status: 'active',
        current_price: 0.55,
        close_date: '2099-01-01T00:00:00.000Z',
        volume: 20_000
      });

      const decisionEngine = await import('@/lib/engine/decision');
      const result = await decisionEngine.runCohortDecisions(cohort.id);

      expect(callOpenRouterWithRetry).toHaveBeenCalledTimes(3);
      expect(result.decisions[0].success).toBe(true);
      expect(result.decisions[0].action).toBe('HOLD');

      const latestDecision = queries.getDecisionsByAgent(agent.id, 1)[0];
      expect(latestDecision.retry_count).toBe(2);
    } finally {
      vi.doUnmock('@/lib/openrouter/client');
      vi.doUnmock('@/lib/constants');
      await ctx.cleanup();
    }
  });
});
