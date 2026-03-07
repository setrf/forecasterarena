import { describe, expect, it, vi } from 'vitest';
import {
  fallbackYesPriceFromPosition,
  resolveSnapshotYesPrice
} from '@/lib/application/cron/snapshotPricing';

describe('cron snapshot pricing', () => {
  it('derives fallback YES prices from both YES and NO positions', () => {
    expect(
      fallbackYesPriceFromPosition({
        id: 'yes-position',
        side: 'YES',
        shares: 100,
        current_value: 72
      })
    ).toBeCloseTo(0.72, 10);

    expect(
      fallbackYesPriceFromPosition({
        id: 'no-position',
        side: 'NO',
        shares: 100,
        current_value: 28
      })
    ).toBeCloseTo(0.72, 10);
  });

  it('uses the live binary market price when it is available', () => {
    const warn = vi.fn();

    const currentPrice = resolveSnapshotYesPrice(
      {
        id: 'position-1',
        side: 'YES',
        shares: 10,
        current_value: 6
      },
      {
        id: 'market-1',
        market_type: 'binary',
        status: 'active',
        current_price: 0.61,
        current_prices: null,
        resolution_outcome: null
      },
      warn
    );

    expect(currentPrice).toBeCloseTo(0.61, 10);
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to prior value for unresolved closed binary markets that would zero a position', () => {
    const warn = vi.fn();

    const currentPrice = resolveSnapshotYesPrice(
      {
        id: 'position-2',
        side: 'YES',
        shares: 20,
        current_value: 14
      },
      {
        id: 'market-2',
        market_type: 'binary',
        status: 'closed',
        current_price: 0,
        current_prices: null,
        resolution_outcome: null
      },
      warn
    );

    expect(currentPrice).toBeCloseTo(0.7, 10);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('closed-unresolved market market-2')
    );
  });

  it('falls back to prior multi-outcome value when the outcome price is missing', () => {
    const warn = vi.fn();

    const currentPrice = resolveSnapshotYesPrice(
      {
        id: 'position-3',
        side: 'Candidate A',
        shares: 50,
        current_value: 20
      },
      {
        id: 'market-3',
        market_type: 'multi_outcome',
        status: 'active',
        current_price: null,
        current_prices: JSON.stringify({ 'Candidate B': 0.7 }),
        resolution_outcome: null
      },
      warn
    );

    expect(currentPrice).toBeCloseTo(0.4, 10);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Using fallback price 0.4000')
    );
  });

  it('defaults to 0.5 when no multi-outcome price or prior value is available', () => {
    const warn = vi.fn();

    const currentPrice = resolveSnapshotYesPrice(
      {
        id: 'position-4',
        side: 'Outcome A',
        shares: 25,
        current_value: null
      },
      {
        id: 'market-4',
        market_type: 'multi_outcome',
        status: 'active',
        current_price: null,
        current_prices: '{bad-json',
        resolution_outcome: null
      },
      warn
    );

    expect(currentPrice).toBe(0.5);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse prices for market market-4')
    );
  });
});
