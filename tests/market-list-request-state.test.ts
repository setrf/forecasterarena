import { describe, expect, it } from 'vitest';
import {
  applyMarketsResponse,
  buildMarketsSearchParams,
  createMarketsRequestMeta
} from '@/features/markets/list/requestState';

const EMPTY_STATS = {
  total_markets: 0,
  active_markets: 0,
  markets_with_positions: 0,
  categories_count: 0
};

describe('market list request state', () => {
  it('builds query params without dropping active filters', () => {
    const params = buildMarketsSearchParams({
      status: 'active',
      category: 'Politics',
      search: 'inflation',
      sort: 'volume',
      cohortBets: true
    }, 50, 100);

    expect(params.toString()).toBe(
      'status=active&category=Politics&search=inflation&cohort_bets=true&sort=volume&limit=50&offset=100'
    );
  });

  it('ignores stale responses and merges append responses using the requested offset', () => {
    const state = {
      markets: [
        {
          id: 'market-1',
          polymarket_id: 'pm-1',
          question: 'Will the first market stay visible?',
          category: 'Politics',
          market_type: 'binary',
          current_price: 0.5,
          volume: 100,
          close_date: '2030-01-01T00:00:00.000Z',
          status: 'active',
          positions_count: 1
        }
      ],
      categories: ['Politics'],
      total: 1,
      hasMore: true,
      stats: EMPTY_STATS,
      offset: 50
    };

    const request = createMarketsRequestMeta(1, state.offset, false);
    const response = {
      markets: [
        {
          id: 'market-2',
          polymarket_id: 'pm-2',
          question: 'Will appended results land once?',
          category: 'Sports',
          market_type: 'binary',
          current_price: 0.4,
          volume: 80,
          close_date: '2030-01-02T00:00:00.000Z',
          status: 'active',
          positions_count: 0
        }
      ],
      total: 2,
      has_more: false,
      categories: ['Politics', 'Sports'],
      stats: {
        total_markets: 2,
        active_markets: 2,
        markets_with_positions: 1,
        categories_count: 2
      }
    };

    expect(applyMarketsResponse(state, request.requestId + 1, request, response)).toBeNull();

    expect(applyMarketsResponse(state, request.requestId, request, response)).toEqual({
      markets: [...state.markets, ...response.markets],
      categories: ['Politics', 'Sports'],
      total: 2,
      hasMore: false,
      stats: response.stats,
      offset: 51
    });
  });
});
