import { describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';
import { createSingleAgentFixture } from '@/tests/helpers/db-fixtures';

async function withResolutionFixture(
  run: (fixture: {
    queries: typeof import('@/lib/db/queries');
    resolution: typeof import('@/lib/engine/resolution');
    cohort: Awaited<ReturnType<typeof createSingleAgentFixture>>['cohort'];
    agent: Awaited<ReturnType<typeof createSingleAgentFixture>>['agent'];
  }) => Promise<void>
) {
  const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

  try {
    const fixture = await createSingleAgentFixture();
    const resolution = await import('@/lib/engine/resolution');

    await run({
      queries: fixture.queries,
      resolution,
      cohort: fixture.cohort,
      agent: fixture.agent
    });
  } finally {
    await ctx.cleanup();
  }
}

describe('engine/resolution', () => {
  it('counts settled positions when a closed market resolves', async () => {
    const fetchMarketById = vi.fn().mockResolvedValue({ id: 'pm-closed' });
    const checkResolution = vi.fn().mockReturnValue({ resolved: true, winner: 'YES' });

    vi.doMock('@/lib/polymarket/client', () => ({
      fetchMarketById,
      checkResolution
    }));

    try {
      await withResolutionFixture(async ({ agent, queries, resolution }) => {
        const market = queries.upsertMarket({
          polymarket_id: `pm-resolution-${Date.now()}`,
          question: 'Will settled positions be counted?',
          close_date: '2030-01-01T00:00:00.000Z',
          status: 'closed',
          current_price: 0.61,
          volume: 1000,
          liquidity: 500
        });

        const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);

        const result = await resolution.checkAllResolutions();

        expect(fetchMarketById).toHaveBeenCalledWith(market.polymarket_id);
        expect(checkResolution).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({
          markets_checked: 1,
          markets_resolved: 1,
          positions_settled: 1,
          errors: []
        });
        expect(queries.getMarketById(market.id)?.status).toBe('resolved');
        expect(queries.getPositionById(position.id)?.status).toBe('settled');
      });
    } finally {
      vi.doUnmock('@/lib/polymarket/client');
    }
  });

  it('records Brier scores after settlement and local market resolution succeed', async () => {
    const fetchMarketById = vi.fn().mockResolvedValue({ id: 'pm-closed' });
    const checkResolution = vi.fn().mockReturnValue({ resolved: true, winner: 'YES' });

    vi.doMock('@/lib/polymarket/client', () => ({
      fetchMarketById,
      checkResolution
    }));

    try {
      await withResolutionFixture(async ({ agent, queries, resolution }) => {
        const market = queries.upsertMarket({
          polymarket_id: `pm-resolution-${Date.now()}`,
          question: 'Will settlement barrel exports keep working?',
          close_date: '2030-01-01T00:00:00.000Z',
          status: 'closed',
          current_price: 0.61,
          volume: 1000,
          liquidity: 500
        });

        queries.updateAgentBalance(agent.id, 9_995, 5);
        const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);
        queries.createTrade({
          agent_id: agent.id,
          market_id: market.id,
          position_id: position.id,
          trade_type: 'BUY',
          side: 'YES',
          shares: 10,
          price: 0.5,
          total_amount: 5,
          implied_confidence: 0.5
        });

        const result = await resolution.checkAllResolutions();
        const updatedAgent = queries.getAgentById(agent.id)!;
        const brierScores = queries.getBrierScoresByAgent(agent.id);

        expect(result).toMatchObject({
          markets_checked: 1,
          markets_resolved: 1,
          positions_settled: 1,
          errors: []
        });
        expect(queries.getPositionById(position.id)?.status).toBe('settled');
        expect(queries.getMarketById(market.id)?.status).toBe('resolved');
        expect(updatedAgent.cash_balance).toBe(10_005);
        expect(updatedAgent.total_invested).toBe(0);
        expect(brierScores).toHaveLength(1);
        expect(brierScores[0]).toMatchObject({
          market_id: market.id,
          actual_outcome: 1,
          forecast_probability: 0.5,
          brier_score: 0.25
        });
      });
    } finally {
      vi.doUnmock('@/lib/polymarket/client');
    }
  });

  it('records Brier scores for fully exited positions when the market resolves', async () => {
    const fetchMarketById = vi.fn().mockResolvedValue({ id: 'pm-closed' });
    const checkResolution = vi.fn().mockReturnValue({ resolved: true, winner: 'YES' });

    vi.doMock('@/lib/polymarket/client', () => ({
      fetchMarketById,
      checkResolution
    }));

    try {
      await withResolutionFixture(async ({ agent, queries, resolution }) => {
        const market = queries.upsertMarket({
          polymarket_id: `pm-exited-resolution-${Date.now()}`,
          question: 'Will exited trades still be scored?',
          close_date: '2030-01-01T00:00:00.000Z',
          status: 'closed',
          current_price: 0.7,
          volume: 1000,
          liquidity: 500
        });
        const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);
        const buyTrade = queries.createTrade({
          agent_id: agent.id,
          market_id: market.id,
          position_id: position.id,
          trade_type: 'BUY',
          side: 'YES',
          shares: 10,
          price: 0.5,
          total_amount: 5,
          implied_confidence: 0.5
        });
        queries.createTrade({
          agent_id: agent.id,
          market_id: market.id,
          position_id: position.id,
          trade_type: 'SELL',
          side: 'YES',
          shares: 10,
          price: 0.7,
          total_amount: 7,
          cost_basis: 5,
          realized_pnl: 2
        });
        queries.reducePosition(position.id, 10);

        const result = await resolution.checkAllResolutions();
        const brierScores = queries.getBrierScoresByAgent(agent.id);

        expect(result).toMatchObject({
          markets_checked: 1,
          markets_resolved: 1,
          positions_settled: 0,
          errors: []
        });
        expect(brierScores).toHaveLength(1);
        expect(brierScores[0]).toMatchObject({
          trade_id: buyTrade.id,
          actual_outcome: 1,
          brier_score: 0.25
        });
      });
    } finally {
      vi.doUnmock('@/lib/polymarket/client');
    }
  });

  it('keeps markets closed when any position settlement fails', async () => {
    const fetchMarketById = vi.fn().mockResolvedValue({ id: 'pm-closed' });
    const checkResolution = vi.fn().mockReturnValue({ resolved: true, winner: 'YES' });

    vi.doMock('@/lib/polymarket/client', () => ({
      fetchMarketById,
      checkResolution
    }));

    let settleCalls = 0;
    vi.doMock('@/lib/db/queries', async () => {
      const actual = await vi.importActual<typeof import('@/lib/db/queries')>('@/lib/db/queries');
      return {
        ...actual,
        settlePosition: vi.fn((positionId: string) => {
          settleCalls += 1;
          if (settleCalls === 2) {
            throw new Error('settlement write failed');
          }
          return actual.settlePosition(positionId);
        })
      };
    });

    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const queries = await import('@/lib/db/queries');
      const dbModule = await import('@/lib/db');
      const db = dbModule.getDb();
      const modelRows = db.prepare(`
        SELECT id FROM models
        ORDER BY id ASC
        LIMIT 2
      `).all() as Array<{ id: string }>;

      db.prepare(`
        UPDATE models
        SET is_active = CASE WHEN id IN (?, ?) THEN 1 ELSE 0 END
      `).run(modelRows[0]!.id, modelRows[1]!.id);

      const cohort = queries.createCohort();
      const agents = queries.createAgentsForCohort(cohort.id);
      const resolution = await import('@/lib/engine/resolution');

      const market = queries.upsertMarket({
        polymarket_id: `pm-resolution-${Date.now()}`,
        question: 'Will partial settlement leave the market closed?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'closed',
        current_price: 0.61,
        volume: 1000,
        liquidity: 500
      });

      const firstPosition = queries.upsertPosition(agents[0]!.id, market.id, 'YES', 10, 0.5, 5);
      const secondPosition = queries.upsertPosition(agents[1]!.id, market.id, 'YES', 8, 0.5, 4);
      queries.createTrade({
        agent_id: agents[0]!.id,
        market_id: market.id,
        position_id: firstPosition.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.5,
        total_amount: 5,
        implied_confidence: 0.5
      });
      queries.createTrade({
        agent_id: agents[1]!.id,
        market_id: market.id,
        position_id: secondPosition.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 8,
        price: 0.5,
        total_amount: 4,
        implied_confidence: 0.5
      });

      const result = await resolution.checkAllResolutions();

      expect(result.markets_checked).toBe(1);
      expect(result.markets_resolved).toBe(0);
      expect(result.positions_settled).toBe(1);
      expect(result.errors).toEqual([
        expect.stringContaining('settlement write failed')
      ]);
      expect(queries.getMarketById(market.id)?.status).toBe('closed');
      expect(queries.getPositionById(firstPosition.id)?.status).toBe('settled');
      expect(queries.getPositionById(secondPosition.id)?.status).toBe('open');
      expect(queries.getBrierScoresByAgent(agents[0]!.id)).toHaveLength(0);
      expect(queries.getBrierScoresByAgent(agents[1]!.id)).toHaveLength(0);
    } finally {
      vi.doUnmock('@/lib/polymarket/client');
      vi.doUnmock('@/lib/db/queries');
      await ctx.cleanup();
    }
  });

  it('surfaces per-market fetch failures in the resolution summary', async () => {
    const fetchMarketById = vi.fn().mockRejectedValue(new Error('network down'));
    const checkResolution = vi.fn();

    vi.doMock('@/lib/polymarket/client', () => ({
      fetchMarketById,
      checkResolution
    }));

    try {
      await withResolutionFixture(async ({ queries, resolution }) => {
        const market = queries.upsertMarket({
          polymarket_id: `pm-resolution-${Date.now()}`,
          question: 'Will resolution failures be reported?',
          close_date: '2030-01-01T00:00:00.000Z',
          status: 'closed',
          current_price: 0.55,
          volume: 1000,
          liquidity: 500
        });

        const result = await resolution.checkAllResolutions();

        expect(fetchMarketById).toHaveBeenCalledWith(market.polymarket_id);
        expect(checkResolution).not.toHaveBeenCalled();
        expect(result.markets_checked).toBe(1);
        expect(result.markets_resolved).toBe(0);
        expect(result.positions_settled).toBe(0);
        expect(result.errors).toEqual([
          `Market ${market.id}: network down`
        ]);
      });
    } finally {
      vi.doUnmock('@/lib/polymarket/client');
    }
  });

  it('defers settlement when a resolved market winner is still undeterminable', async () => {
    const fetchMarketById = vi.fn().mockResolvedValue({ id: 'pm-closed' });
    const checkResolution = vi.fn().mockReturnValue({
      resolved: true,
      winner: 'UNKNOWN',
      error: 'Token prices were not decisive'
    });

    vi.doMock('@/lib/polymarket/client', () => ({
      fetchMarketById,
      checkResolution
    }));

    try {
      await withResolutionFixture(async ({ agent, queries, resolution }) => {
        const market = queries.upsertMarket({
          polymarket_id: `pm-resolution-${Date.now()}`,
          question: 'Will unknown winners stay pending?',
          close_date: '2030-01-01T00:00:00.000Z',
          status: 'closed',
          current_price: 0.51,
          volume: 1000,
          liquidity: 500
        });

        const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);
        const result = await resolution.checkAllResolutions();
        const updatedMarket = queries.getMarketById(market.id)!;
        const updatedPosition = queries.getPositionById(position.id)!;

        expect(result.markets_checked).toBe(1);
        expect(result.markets_resolved).toBe(0);
        expect(result.positions_settled).toBe(0);
        expect(result.errors).toEqual([
          `Market ${market.id}: Token prices were not decisive`
        ]);
        expect(updatedMarket.status).toBe('closed');
        expect(updatedMarket.resolution_outcome).toBeNull();
        expect(updatedPosition.status).toBe('open');
      });
    } finally {
      vi.doUnmock('@/lib/polymarket/client');
    }
  });

  it('rechecks unresolved markets that were already marked resolved by market sync', async () => {
    const fetchMarketById = vi.fn().mockResolvedValue({ id: 'pm-closed' });
    const checkResolution = vi.fn().mockReturnValue({ resolved: true, winner: 'YES' });

    vi.doMock('@/lib/polymarket/client', () => ({
      fetchMarketById,
      checkResolution
    }));

    try {
      await withResolutionFixture(async ({ agent, queries, resolution }) => {
        const market = queries.upsertMarket({
          polymarket_id: `pm-resolution-${Date.now()}`,
          question: 'Will resolved-but-unsettled markets still be checked?',
          close_date: '2030-01-01T00:00:00.000Z',
          status: 'resolved',
          current_price: 0.8,
          volume: 1000,
          liquidity: 500
        });

        const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);

        const result = await resolution.checkAllResolutions();

        expect(result).toMatchObject({
          markets_checked: 1,
          markets_resolved: 1,
          positions_settled: 1,
          errors: []
        });
        expect(fetchMarketById).toHaveBeenCalledWith(market.polymarket_id);
        expect(queries.getMarketById(market.id)?.resolution_outcome).toBe('YES');
        expect(queries.getPositionById(position.id)?.status).toBe('settled');
      });
    } finally {
      vi.doUnmock('@/lib/polymarket/client');
    }
  });

  it('handles cancelled markets by either internal or polymarket identifier', async () => {
    await withResolutionFixture(async ({ agent, queries, resolution }) => {
      const marketOne = queries.upsertMarket({
        polymarket_id: `pm-cancel-${Date.now()}-1`,
        question: 'Will internal id cancellation work?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'closed',
        current_price: 0.45,
        volume: 1000,
        liquidity: 500
      });
      const marketTwo = queries.upsertMarket({
        polymarket_id: `pm-cancel-${Date.now()}-2`,
        question: 'Will polymarket id cancellation work?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'closed',
        current_price: 0.55,
        volume: 1000,
        liquidity: 500
      });

      const positionOne = queries.upsertPosition(agent.id, marketOne.id, 'YES', 4, 0.5, 2);
      const positionTwo = queries.upsertPosition(agent.id, marketTwo.id, 'NO', 6, 0.4, 2.4);

      expect(resolution.handleCancelledMarket(marketOne.id)).toBe(1);
      expect(resolution.handleCancelledMarket(marketTwo.polymarket_id)).toBe(1);

      expect(queries.getMarketById(marketOne.id)?.resolution_outcome).toBe('CANCELLED');
      expect(queries.getMarketById(marketTwo.id)?.resolution_outcome).toBe('CANCELLED');
      expect(queries.getPositionById(positionOne.id)?.status).toBe('settled');
      expect(queries.getPositionById(positionTwo.id)?.status).toBe('settled');
    });
  });

  it('re-exports handleCancelledMarket from the settlement module path', async () => {
    await withResolutionFixture(async ({ agent, queries }) => {
      const settlement = await import('@/lib/engine/resolution/settlement');
      const market = queries.upsertMarket({
        polymarket_id: `pm-cancel-${Date.now()}-settlement`,
        question: 'Will settlement continue exporting cancellation handling?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'closed',
        current_price: 0.45,
        volume: 1000,
        liquidity: 500
      });

      const position = queries.upsertPosition(agent.id, market.id, 'YES', 4, 0.5, 2);

      expect(settlement.handleCancelledMarket(market.id)).toBe(1);
      expect(queries.getMarketById(market.id)?.resolution_outcome).toBe('CANCELLED');
      expect(queries.getPositionById(position.id)?.status).toBe('settled');
    });
  });
});
