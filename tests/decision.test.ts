import { describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';
import {
  createSingleAgentFixture,
  createTestBenchmarkConfigForLegacyModels
} from '@/tests/helpers/db-fixtures';

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

function mockOpenRouterModule(callOpenRouterWithRetry: ReturnType<typeof vi.fn>) {
  return {
    callOpenRouterWithRetry,
    estimateCost: vi.fn(() => 0.001),
    estimateCostFromSnapshot: vi.fn(() => 0.001)
  };
}

async function createMultiAgentFixture(activeModelCount: number = 2) {
  const queries = await import('@/lib/db/queries');
  const dbModule = await import('@/lib/db');
  const db = dbModule.getDb();

  const modelRows = db.prepare(`
    SELECT id FROM models
    ORDER BY id ASC
    LIMIT ?
  `).all(activeModelCount) as Array<{ id: string }>;

  const placeholders = modelRows.map(() => '?').join(', ');
  db.prepare(`
    UPDATE models
    SET is_active = CASE WHEN id IN (${placeholders}) THEN 1 ELSE 0 END
  `).run(...modelRows.map(row => row.id));

  const benchmarkConfig = await createTestBenchmarkConfigForLegacyModels(
    modelRows.map((row) => row.id)
  );
  const cohort = queries.createCohort(benchmarkConfig.id);
  const agents = queries.createAgentsForCohort(cohort.id, benchmarkConfig.id);

  return { queries, dbModule, db, cohort, agents };
}

describe('engine/decision', () => {
  it('exports processAgentDecision from the stable module path and skips bankrupt agents', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const callOpenRouterWithRetry = vi.fn();

    vi.doMock('@/lib/openrouter/client', () => mockOpenRouterModule(callOpenRouterWithRetry));

    try {
      const { cohort, agent } = await createSingleAgentFixture();
      const dbModule = await import('@/lib/db');
      const db = dbModule.getDb();
      const { getAgentsWithModelsByCohort } = await import('@/lib/db/queries');
      const { processAgentDecision } = await import('@/lib/engine/decision/processAgentDecision');

      db.prepare(`UPDATE agents SET status = 'bankrupt' WHERE id = ?`).run(agent.id);

      const bankruptAgent = getAgentsWithModelsByCohort(cohort.id)[0]!;
      const result = await processAgentDecision(bankruptAgent, cohort.id, 1, []);

      expect(callOpenRouterWithRetry).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        agent_id: agent.id,
        model_id: agent.model_id,
        action: 'SKIPPED',
        success: true
      });
    } finally {
      vi.doUnmock('@/lib/openrouter/client');
      await ctx.cleanup();
    }
  });

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

    vi.doMock('@/lib/openrouter/client', () => mockOpenRouterModule(callOpenRouterWithRetry));

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

    vi.doMock('@/lib/openrouter/client', () => mockOpenRouterModule(callOpenRouterWithRetry));

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
  }, 60000);

  it('records a lineage-aware api_costs row when a decision is finalized', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const callOpenRouterWithRetry = vi.fn().mockResolvedValue(
      response(
        JSON.stringify({
          action: 'HOLD',
          reasoning: 'No trade, but still bill tokens.'
        })
      )
    );

    vi.doMock('@/lib/openrouter/client', () => mockOpenRouterModule(callOpenRouterWithRetry));

    try {
      const { queries, cohort, agent, db } = await createSingleAgentFixture();
      queries.upsertMarket({
        polymarket_id: nextMarketId(),
        question: 'Will finalized decisions write lineage-aware API costs?',
        market_type: 'binary',
        status: 'active',
        current_price: 0.51,
        close_date: '2099-01-01T00:00:00.000Z',
        volume: 11_000
      });

      const decisionEngine = await import('@/lib/engine/decision');
      const result = await decisionEngine.runCohortDecisions(cohort.id);
      expect(result.decisions[0]?.success).toBe(true);

      const decision = queries.getDecisionsByAgent(agent.id, 1)[0]!;
      const apiCost = db.prepare(`
        SELECT *
        FROM api_costs
        WHERE decision_id = ?
      `).get(decision.id) as {
        model_id: string;
        agent_id: string;
        family_id: string;
        release_id: string;
        benchmark_config_model_id: string;
        cost_usd: number;
      } | undefined;

      expect(apiCost).toMatchObject({
        model_id: agent.model_id,
        agent_id: agent.id,
        family_id: agent.family_id,
        release_id: agent.release_id,
        benchmark_config_model_id: agent.benchmark_config_model_id,
        cost_usd: 0.001
      });
    } finally {
      vi.doUnmock('@/lib/openrouter/client');
      await ctx.cleanup();
    }
  }, 60000);

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

    vi.doMock('@/lib/openrouter/client', () => mockOpenRouterModule(callOpenRouterWithRetry));

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
      expect(queries.getTotalDecisionsForCohort(cohort.id)).toBe(1);
    } finally {
      vi.doUnmock('@/lib/openrouter/client');
      vi.doUnmock('@/lib/constants');
      await ctx.cleanup();
    }
  });

  it('retries a prior BET decision when no trades were recorded', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const callOpenRouterWithRetry = vi.fn().mockResolvedValue(
      response(
        JSON.stringify({
          action: 'HOLD',
          reasoning: 'Retry the agent because no trades were recorded.'
        })
      )
    );

    vi.doMock('@/lib/openrouter/client', () => mockOpenRouterModule(callOpenRouterWithRetry));

    try {
      const { queries, cohort, agent } = await createSingleAgentFixture();
      const { calculateWeekNumber } = await import('@/lib/utils');
      const week = calculateWeekNumber(cohort.started_at);

      queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: week,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET',
        reasoning: 'Earlier attempt with no trades'
      });

      const decisionEngine = await import('@/lib/engine/decision');
      const result = await decisionEngine.runCohortDecisions(cohort.id);

      expect(callOpenRouterWithRetry).toHaveBeenCalledTimes(1);
      expect(result.decisions[0].action).toBe('HOLD');
      expect(result.decisions[0].success).toBe(true);
    } finally {
      vi.doUnmock('@/lib/openrouter/client');
      await ctx.cleanup();
    }
  });

  it('surfaces zero-trade BET failures and retries them on rerun', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const callOpenRouterWithRetry = vi.fn().mockResolvedValue(
      response(
        JSON.stringify({
          action: 'BET',
          reasoning: 'Attempt one trade',
          bets: [{ market_id: 'market-1', side: 'YES', amount: 100 }]
        })
      )
    );
    const executeBetsAtomically = vi.fn().mockReturnValue([
      { success: false, error: 'Market temporarily unavailable' }
    ]);

    vi.doMock('@/lib/openrouter/client', () => mockOpenRouterModule(callOpenRouterWithRetry));
    vi.doMock('@/lib/engine/execution', async () => {
      const actual = await vi.importActual<typeof import('@/lib/engine/execution')>('@/lib/engine/execution');
      return {
        ...actual,
        executeBetsAtomically,
        executeSells: vi.fn(actual.executeSells)
      };
    });

    try {
      const { queries, cohort } = await createSingleAgentFixture();
      queries.upsertMarket({
        id: 'market-1',
        polymarket_id: nextMarketId(),
        question: 'Will retryable BET failures be surfaced?',
        market_type: 'binary',
        status: 'active',
        current_price: 0.52,
        close_date: '2099-01-01T00:00:00.000Z',
        volume: 50_000
      });

      const decisionEngine = await import('@/lib/engine/decision');
      const firstRun = await decisionEngine.runCohortDecisions(cohort.id);
      const secondRun = await decisionEngine.runCohortDecisions(cohort.id);

      expect(firstRun.decisions[0].success).toBe(false);
      expect(firstRun.decisions[0].trades_executed).toBe(0);
      expect(firstRun.errors).toEqual([
        expect.stringContaining('Market temporarily unavailable')
      ]);
      expect(secondRun.decisions[0].success).toBe(false);
      expect(callOpenRouterWithRetry).toHaveBeenCalledTimes(2);
      expect(executeBetsAtomically).toHaveBeenCalledTimes(2);
      expect(queries.getTotalDecisionsForCohort(cohort.id)).toBe(1);
    } finally {
      vi.doUnmock('@/lib/openrouter/client');
      vi.doUnmock('@/lib/engine/execution');
      await ctx.cleanup();
    }
  });

  it('does not retry failed BET legs within the same decision run', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const callOpenRouterWithRetry = vi.fn().mockResolvedValue(
      response(
        JSON.stringify({
          action: 'BET',
          reasoning: 'Attempt two trades',
          bets: [
            { market_id: 'market-1', side: 'YES', amount: 100 },
            { market_id: 'market-2', side: 'NO', amount: 100 }
          ]
        })
      )
    );
    const executeBetsAtomically = vi.fn().mockReturnValue([
      { success: false, error: 'BET batch failed; no trades executed: Temporary liquidity miss' }
    ]);

    vi.doMock('@/lib/openrouter/client', () => mockOpenRouterModule(callOpenRouterWithRetry));
    vi.doMock('@/lib/engine/execution', async () => {
      const actual = await vi.importActual<typeof import('@/lib/engine/execution')>('@/lib/engine/execution');
      return {
        ...actual,
        executeBetsAtomically,
        executeSells: vi.fn(actual.executeSells)
      };
    });

    try {
      const { queries, cohort } = await createSingleAgentFixture();
      queries.upsertMarket({
        id: 'market-1',
        polymarket_id: nextMarketId(),
        question: 'Will partial bet retries preserve successful legs?',
        market_type: 'binary',
        status: 'active',
        current_price: 0.52,
        close_date: '2099-01-01T00:00:00.000Z',
        volume: 50_000
      });
      queries.upsertMarket({
        id: 'market-2',
        polymarket_id: nextMarketId(),
        question: 'Will failed bet legs retry once?',
        market_type: 'binary',
        status: 'active',
        current_price: 0.48,
        close_date: '2099-01-01T00:00:00.000Z',
        volume: 45_000
      });

      const decisionEngine = await import('@/lib/engine/decision');
      const result = await decisionEngine.runCohortDecisions(cohort.id);

      expect(result.decisions[0].success).toBe(false);
      expect(result.decisions[0].trades_executed).toBe(0);
      expect(result.errors).toEqual([
        expect.stringContaining('Temporary liquidity miss')
      ]);
      expect(executeBetsAtomically).toHaveBeenCalledTimes(1);
      expect(executeBetsAtomically.mock.calls[0]?.[1]).toHaveLength(2);
    } finally {
      vi.doUnmock('@/lib/openrouter/client');
      vi.doUnmock('@/lib/engine/execution');
      await ctx.cleanup();
    }
  });

  it('persists partial SELL execution failures and keeps them visible on rerun', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    let sellPositionId = 'position-not-created-yet';
    const callOpenRouterWithRetry = vi.fn().mockImplementation(async () => (
      response(JSON.stringify({
          action: 'SELL',
          reasoning: 'Attempt two sells with one partial failure',
          sells: [
            { position_id: sellPositionId, percentage: 50 },
            { position_id: 'missing-position', percentage: 50 }
          ]
        }))
    ));

    vi.doMock('@/lib/openrouter/client', () => mockOpenRouterModule(callOpenRouterWithRetry));

    try {
      const { queries, cohort, agent } = await createSingleAgentFixture();
      const market = queries.upsertMarket({
        polymarket_id: nextMarketId(),
        question: 'Will the successful partial sell stay recorded?',
        market_type: 'binary',
        status: 'active',
        current_price: 0.52,
        close_date: '2099-01-01T00:00:00.000Z',
        volume: 50_000
      });
      const position = queries.upsertPosition(agent.id, market.id, 'YES', 20, 0.5, 10);
      sellPositionId = position.id;
      agent.cash_balance -= 10;
      queries.updateAgentBalance(agent.id, 9_990, 10);
      queries.updatePositionMTM(position.id, 10.4, 0.4);

      const decisionEngine = await import('@/lib/engine/decision');
      const firstRun = await decisionEngine.runCohortDecisions(cohort.id);
      const decision = queries.getDecisionsByAgent(agent.id, 1)[0]!;
      const secondRun = await decisionEngine.runCohortDecisions(cohort.id);

      expect(firstRun.decisions[0]).toMatchObject({
        action: 'SELL',
        success: false,
        trades_executed: 1,
        error: 'Position not found'
      });
      expect(decision.error_message).toBe('Position not found');
      expect(queries.getTradesByDecision(decision.id)).toHaveLength(1);
      expect(secondRun.decisions[0]).toMatchObject({
        action: 'SELL',
        success: false,
        decision_id: decision.id,
        error: 'Position not found'
      });
      expect(callOpenRouterWithRetry).toHaveBeenCalledTimes(1);
    } finally {
      vi.doUnmock('@/lib/openrouter/client');
      await ctx.cleanup();
    }
  });

  it('loads top markets once per cohort run instead of once per agent', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const callOpenRouterWithRetry = vi.fn().mockResolvedValue(
      response(
        JSON.stringify({
          action: 'HOLD',
          reasoning: 'No trade'
        })
      )
    );

    vi.doMock('@/lib/openrouter/client', () => mockOpenRouterModule(callOpenRouterWithRetry));

    try {
      const { queries, cohort, agents } = await createMultiAgentFixture(2);
      const market = queries.upsertMarket({
        polymarket_id: nextMarketId(),
        question: 'Will top markets be loaded only once?',
        market_type: 'binary',
        status: 'active',
        current_price: 0.61,
        close_date: '2099-01-01T00:00:00.000Z',
        volume: 99_999
      });

      const getTopMarketsByVolumeSpy = vi
        .spyOn(queries, 'getTopMarketsByVolume')
        .mockReturnValue([market]);

      const decisionEngine = await import('@/lib/engine/decision');
      const result = await decisionEngine.runCohortDecisions(cohort.id);

      expect(agents).toHaveLength(2);
      expect(callOpenRouterWithRetry).toHaveBeenCalledTimes(2);
      expect(getTopMarketsByVolumeSpy).toHaveBeenCalledTimes(1);
      expect(result.agents_processed).toBe(2);

      getTopMarketsByVolumeSpy.mockRestore();
    } finally {
      vi.doUnmock('@/lib/openrouter/client');
      await ctx.cleanup();
    }
  });
});
