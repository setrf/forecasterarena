import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Market } from '@/lib/types';

function market(overrides: Partial<Market> = {}): Market {
  return {
    id: 'market-1',
    polymarket_id: 'pm-1',
    slug: null,
    event_slug: null,
    question: 'Question?',
    description: null,
    category: null,
    market_type: 'binary',
    outcomes: null,
    close_date: '2099-01-01',
    status: 'active',
    current_price: 0.9,
    current_prices: null,
    clob_token_ids: '["yes-token","no-token"]',
    volume: 100,
    liquidity: 50,
    resolution_outcome: null,
    resolved_at: null,
    first_seen_at: '2026-01-01 00:00:00',
    last_updated_at: '2026-01-01 00:00:00',
    ...overrides
  };
}

describe('validated market pricing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('uses CLOB midpoint as authoritative when Gamma disagrees', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ 'yes-token': '0.25' }), { status: 200 })
    ));

    const { getValidatedMarketPrices, getValidatedSidePrice } = await import('@/lib/pricing/marketPrices');
    const prices = await getValidatedMarketPrices([market()]);
    const validated = prices.get('market-1');

    expect(validated?.source).toBe('clob');
    expect(validated?.validationStatus).toBe('accepted_with_gamma_disagreement');
    expect(validated?.anomalyReason).toContain('Gamma price 0.9000 differs');
    expect(getValidatedSidePrice({
      market: market(),
      side: 'YES',
      validatedPrice: validated
    })).toBe(0.25);
    expect(getValidatedSidePrice({
      market: market(),
      side: 'NO',
      validatedPrice: validated
    })).toBe(0.75);
  });

  it('maps multi-outcome CLOB tokens by outcome order', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token_a: '0.2', token_b: '0.7' }), { status: 200 })
    ));

    const multi = market({
      market_type: 'multi_outcome',
      outcomes: '["A","B"]',
      current_price: null,
      current_prices: JSON.stringify({ A: 0.2, B: 0.7 }),
      clob_token_ids: '["token_a","token_b"]'
    });
    const { getValidatedMarketPrices, getValidatedSidePrice } = await import('@/lib/pricing/marketPrices');
    const prices = await getValidatedMarketPrices([multi]);
    const validated = prices.get('market-1');

    expect(validated?.source).toBe('clob');
    expect(getValidatedSidePrice({ market: multi, side: 'B', validatedPrice: validated })).toBe(0.7);
  });

  it('returns fallback status when CLOB token ids are missing', async () => {
    const { getValidatedMarketPrices } = await import('@/lib/pricing/marketPrices');
    const prices = await getValidatedMarketPrices([market({ clob_token_ids: null })]);
    const validated = prices.get('market-1');

    expect(validated?.source).toBe('fallback');
    expect(validated?.anomalyReason).toBe('Missing CLOB YES token id');
  });

  it('hydrates missing token ids from Gamma before pricing old database rows', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('gamma-api.polymarket.com')) {
        return new Response(JSON.stringify({
          id: 'pm-1',
          question: 'Question?',
          active: true,
          archived: false,
          closed: false,
          outcomes: '["Yes","No"]',
          clobTokenIds: '["gamma-yes","gamma-no"]'
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ 'gamma-yes': '0.31' }), { status: 200 });
    }));

    const { getValidatedMarketPrices } = await import('@/lib/pricing/marketPrices');
    const prices = await getValidatedMarketPrices([market({ clob_token_ids: null })]);
    const validated = prices.get('market-1');

    expect(validated?.source).toBe('clob');
    expect(validated?.clobTokenIds).toBe('["gamma-yes","gamma-no"]');
    expect(validated?.yesPrice).toBe(0.31);
  });
});
