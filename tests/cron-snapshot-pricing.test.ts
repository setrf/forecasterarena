import { describe, expect, it, vi } from 'vitest';
import {
  fallbackYesPriceFromPosition,
  resolveValidatedSnapshotYesPrice
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

  it('uses the validated binary CLOB price when it is available', () => {
    const warn = vi.fn();

    const currentPrice = resolveValidatedSnapshotYesPrice(
      {
        id: 'position-1',
        side: 'YES',
        shares: 10,
        current_value: 6,
        avg_entry_price: 0.55
      },
      {
        id: 'market-1',
        market_type: 'binary',
        current_price: 0.91,
        current_prices: null
      },
      {
        marketId: 'market-1',
        source: 'clob',
        yesPrice: 0.61,
        outcomePrices: undefined,
        gammaPrice: 0.91,
        gammaPrices: null,
        clobTokenIds: '["yes-token","no-token"]',
        validationStatus: 'accepted',
        anomalyReason: null
      },
      warn
    );

    expect(currentPrice).toBeCloseTo(0.61, 10);
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to prior value when validated CLOB price is unavailable', () => {
    const warn = vi.fn();

    const currentPrice = resolveValidatedSnapshotYesPrice(
      {
        id: 'position-2',
        side: 'YES',
        shares: 20,
        current_value: 14,
        avg_entry_price: 0.3
      },
      {
        id: 'market-2',
        market_type: 'binary',
        current_price: 0,
        current_prices: null
      },
      undefined,
      warn
    );

    expect(currentPrice).toBeCloseTo(0.7, 10);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('prior value fallback 0.7000')
    );
  });

  it('uses validated multi-outcome CLOB prices by side', () => {
    const warn = vi.fn();

    const currentPrice = resolveValidatedSnapshotYesPrice(
      {
        id: 'position-3',
        side: 'Candidate A',
        shares: 50,
        current_value: 20,
        avg_entry_price: 0.3
      },
      {
        id: 'market-3',
        market_type: 'multi_outcome',
        current_price: null,
        current_prices: JSON.stringify({ 'Candidate B': 0.7 })
      },
      {
        marketId: 'market-3',
        source: 'clob',
        yesPrice: undefined,
        outcomePrices: { 'Candidate A': 0.4, 'Candidate B': 0.6 },
        gammaPrice: null,
        gammaPrices: JSON.stringify({ 'Candidate B': 0.7 }),
        clobTokenIds: '["candidate-a","candidate-b"]',
        validationStatus: 'accepted',
        anomalyReason: null
      },
      warn
    );

    expect(currentPrice).toBeCloseTo(0.4, 10);
    expect(warn).not.toHaveBeenCalled();
  });

  it('uses entry price when no validated price or prior value is available', () => {
    const warn = vi.fn();

    const currentPrice = resolveValidatedSnapshotYesPrice(
      {
        id: 'position-4',
        side: 'Outcome A',
        shares: 25,
        current_value: null,
        avg_entry_price: 0.33
      },
      {
        id: 'market-4',
        market_type: 'multi_outcome',
        current_price: null,
        current_prices: '{bad-json'
      },
      undefined,
      warn
    );

    expect(currentPrice).toBe(0.33);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('entry price fallback 0.3300')
    );
  });
});
