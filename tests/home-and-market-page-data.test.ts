import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchHomePerformanceData, fetchHomeSummary } from '@/features/home/api';
import { fetchMarketDetailData } from '@/features/markets/detail/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('home page data helpers', () => {
  it('normalizes leaderboard, real-data detection, and market count', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockResponse(true, {
        leaderboard: [
          {
            model_id: 'gpt-5.1',
            display_name: 'GPT-5.2',
            provider: 'OpenAI',
            color: '#10B981',
            total_pnl: 100,
            total_pnl_percent: 1,
            avg_brier_score: 0.12,
            num_cohorts: 2,
            num_resolved_bets: 3,
            win_rate: 0.66
          }
        ],
        cohorts: [{ id: 'c1' }]
      }))
      .mockResolvedValueOnce(mockResponse(true, {
        stats: { total_markets: 42 }
      })));

    await expect(fetchHomeSummary()).resolves.toEqual({
      leaderboard: [
        expect.objectContaining({
          model_id: 'gpt-5.1',
          total_pnl: 100
        })
      ],
      hasRealData: true,
      marketCount: 42
    });
  });

  it('throws stable errors for unavailable summary and performance endpoints', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockResponse(false, {})));

    await expect(fetchHomeSummary()).rejects.toThrow('Leaderboard data is temporarily unavailable.');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockResponse(false, {})));

    await expect(fetchHomePerformanceData('1M')).rejects.toThrow('Performance data is temporarily unavailable.');
  });
});

describe('market detail page data helper', () => {
  it('normalizes market detail payloads and preserves 404 behavior', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockResponse(true, {
        market: {
          id: 'm1',
          polymarket_id: 'pm1',
          slug: 'market-1',
          event_slug: null,
          question: 'Will this normalize?',
          description: null,
          category: 'Politics',
          market_type: 'binary',
          current_price: 0.55,
          volume: 1000,
          liquidity: 500,
          close_date: '2030-01-01T00:00:00.000Z',
          status: 'resolved',
          resolution_outcome: 'YES',
          resolved_at: '2030-01-02T00:00:00.000Z',
          first_seen_at: '2029-12-01T00:00:00.000Z',
          last_updated_at: '2030-01-01T00:00:00.000Z'
        },
        positions: [{ id: 'p1' }],
        trades: [{ id: 't1' }],
        brier_scores: [{ id: 'b1' }]
      }))
      .mockResolvedValueOnce(mockResponse(false, {}, 404))
      .mockResolvedValueOnce(mockResponse(false, {}, 500)));

    await expect(fetchMarketDetailData('m1')).resolves.toEqual({
      status: 'ok',
      data: {
        market: expect.objectContaining({ id: 'm1' }),
        positions: [expect.objectContaining({ id: 'p1' })],
        trades: [expect.objectContaining({ id: 't1' })],
        brierScores: [expect.objectContaining({ id: 'b1' })]
      }
    });
    await expect(fetchMarketDetailData('missing')).resolves.toEqual({
      status: 'error',
      error: 'Market not found'
    });
    await expect(fetchMarketDetailData('broken')).resolves.toEqual({
      status: 'error',
      error: 'Failed to load market'
    });
  });
});

function mockResponse(ok: boolean, json: unknown, status: number = 200) {
  return {
    ok,
    status,
    json: async () => json
  };
}
