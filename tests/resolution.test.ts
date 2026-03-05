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

  it('refunds positions as CANCELLED when a resolved market winner is undeterminable', async () => {
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
          question: 'Will unknown winners be refunded?',
          close_date: '2030-01-01T00:00:00.000Z',
          status: 'closed',
          current_price: 0.51,
          volume: 1000,
          liquidity: 500
        });

        const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);
        const startingAgent = queries.getAgentById(agent.id)!;

        const result = await resolution.checkAllResolutions();
        const updatedMarket = queries.getMarketById(market.id)!;
        const updatedPosition = queries.getPositionById(position.id)!;
        const updatedAgent = queries.getAgentById(agent.id)!;

        expect(result.markets_checked).toBe(1);
        expect(result.markets_resolved).toBe(1);
        expect(result.positions_settled).toBe(1);
        expect(result.errors).toEqual([
          `Market ${market.id}: Token prices were not decisive`
        ]);
        expect(updatedMarket.status).toBe('resolved');
        expect(updatedMarket.resolution_outcome).toBe('CANCELLED');
        expect(updatedPosition.status).toBe('settled');
        expect(updatedAgent.cash_balance).toBeCloseTo(startingAgent.cash_balance + 5, 10);
        expect(updatedAgent.total_invested).toBe(0);
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
});
