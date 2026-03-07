import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('@/lib/db');
  vi.doUnmock('@/lib/engine/market/upsertTopMarkets');
  vi.doUnmock('@/lib/engine/market/refreshStatuses');
  vi.resetModules();
});

describe('engine/market', () => {
  it('combines market upserts and status refresh into one sync result', async () => {
    const logSystemEvent = vi.fn();
    const upsertTopMarkets = vi.fn(async () => ({ added: 2, updated: 3 }));
    const refreshExistingMarketStatuses = vi.fn(async () => ({
      checked: 5,
      statusUpdates: 4
    }));

    vi.doMock('@/lib/db', () => ({ logSystemEvent }));
    vi.doMock('@/lib/engine/market/upsertTopMarkets', () => ({ upsertTopMarkets }));
    vi.doMock('@/lib/engine/market/refreshStatuses', () => ({ refreshExistingMarketStatuses }));

    const marketEngine = await import('@/lib/engine/market');
    const result = await marketEngine.syncMarkets();

    expect(upsertTopMarkets).toHaveBeenCalledOnce();
    expect(refreshExistingMarketStatuses).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      success: true,
      markets_added: 2,
      markets_updated: 3,
      errors: []
    });
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    expect(logSystemEvent).toHaveBeenCalledWith(
      'market_sync_complete',
      expect.objectContaining({
        markets_added: 2,
        markets_updated: 3,
        status_updates: 4,
        errors: 0
      })
    );
  });

  it('logs and rethrows sync failures', async () => {
    const logSystemEvent = vi.fn();
    const upsertTopMarkets = vi.fn(async () => {
      throw new Error('sync failed');
    });

    vi.doMock('@/lib/db', () => ({ logSystemEvent }));
    vi.doMock('@/lib/engine/market/upsertTopMarkets', () => ({ upsertTopMarkets }));
    vi.doMock('@/lib/engine/market/refreshStatuses', () => ({
      refreshExistingMarketStatuses: vi.fn()
    }));

    const marketEngine = await import('@/lib/engine/market');

    await expect(marketEngine.syncMarkets()).rejects.toThrow('sync failed');
    expect(logSystemEvent).toHaveBeenCalledWith(
      'market_sync_error',
      { error: 'sync failed' },
      'error'
    );
  });
});
