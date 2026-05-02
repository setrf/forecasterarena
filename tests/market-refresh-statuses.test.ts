import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

describe('engine/market/refreshStatuses', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.doUnmock('@/lib/polymarket/client');
    vi.useRealTimers();
  });

  it('refreshes same-day stale active markets and updates non-status fields even when status is unchanged', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const fetchMarketById = vi.fn().mockResolvedValue({ id: 'pm-refresh-1' });
    const simplifyMarket = vi.fn().mockReturnValue({
      polymarket_id: 'pm-refresh-1',
      question: 'Will refreshed market fields persist?',
      close_date: '2026-03-05T18:00:00.000Z',
      status: 'active',
      current_price: 0.75,
      volume: 2500,
      liquidity: 900
    });

    vi.doMock('@/lib/polymarket/client', () => ({
      fetchMarketById,
      simplifyMarket
    }));

    try {
      const queries = await import('@/lib/db/queries');
      const refreshModule = await import('@/lib/engine/market/refreshStatuses');

      const market = queries.upsertMarket({
        polymarket_id: 'pm-refresh-1',
        question: 'Will refreshed market fields persist?',
        close_date: '2026-03-05T00:00:00.000Z',
        status: 'active',
        current_price: 0.42,
        volume: 1000,
        liquidity: 300
      });

      const result = await refreshModule.refreshExistingMarketStatuses([]);
      const refreshed = queries.getMarketById(market.id)!;

      expect(result).toEqual({
        checked: 1,
        statusUpdates: 0
      });
      expect(fetchMarketById).toHaveBeenCalledWith('pm-refresh-1');
      expect(refreshed.current_price).toBe(0.75);
      expect(refreshed.volume).toBe(2500);
      expect(refreshed.liquidity).toBe(900);
      expect(refreshed.status).toBe('active');
    } finally {
      await ctx.cleanup();
    }
  });

  it('rotates through stale active markets without open positions to catch early closures', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    const fetchMarketById = vi.fn().mockResolvedValue({ id: 'pm-stale-closed' });
    const simplifyMarket = vi.fn().mockReturnValue({
      polymarket_id: 'pm-stale-closed',
      question: 'Will this early-closed market refresh?',
      close_date: '2026-12-31T00:00:00.000Z',
      status: 'closed',
      current_price: 0,
      volume: 1000,
      liquidity: 0
    });

    vi.doMock('@/lib/polymarket/client', () => ({
      fetchMarketById,
      simplifyMarket
    }));

    try {
      const queries = await import('@/lib/db/queries');
      const { getDb } = await import('@/lib/db');
      const refreshModule = await import('@/lib/engine/market/refreshStatuses');

      const market = queries.upsertMarket({
        polymarket_id: 'pm-stale-closed',
        question: 'Will this early-closed market refresh?',
        close_date: '2026-12-31T00:00:00.000Z',
        status: 'active',
        current_price: 0.4,
        volume: 1000,
        liquidity: 300
      });
      getDb().prepare('UPDATE markets SET last_updated_at = ? WHERE id = ?')
        .run('2026-03-04 00:00:00', market.id);

      const result = await refreshModule.refreshExistingMarketStatuses([]);
      const refreshed = queries.getMarketById(market.id)!;

      expect(result.checked).toBe(1);
      expect(result.statusUpdates).toBe(1);
      expect(fetchMarketById).toHaveBeenCalledWith('pm-stale-closed');
      expect(refreshed.status).toBe('closed');
      expect(refreshed.current_price).toBe(0);
    } finally {
      await ctx.cleanup();
    }
  });
});
