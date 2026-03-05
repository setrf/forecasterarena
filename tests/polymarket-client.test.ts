import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectDecisivePrices } from '@/lib/polymarket/resolution';
import type { PolymarketEvent, PolymarketMarket } from '@/lib/polymarket/types';

function makeMarket(overrides: Partial<PolymarketMarket> = {}): PolymarketMarket {
  return {
    id: 'market-1',
    question: 'Will the market resolve?',
    end_date_iso: '2099-01-01T00:00:00.000Z',
    closed: false,
    archived: false,
    active: true,
    volumeNum: 100,
    ...overrides
  };
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
}

describe('polymarket client facade', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('fetchMarkets requests the expected gamma markets query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([makeMarket()]));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    const markets = await client.fetchMarkets(25, 5);

    expect(markets).toHaveLength(1);

    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestedUrl.pathname).toBe('/markets');
    expect(requestedUrl.searchParams.get('limit')).toBe('25');
    expect(requestedUrl.searchParams.get('offset')).toBe('5');
    expect(requestedUrl.searchParams.get('active')).toBe('true');
    expect(requestedUrl.searchParams.get('closed')).toBe('false');
    expect(requestedUrl.searchParams.get('order')).toBe('volumeNum');
    expect(requestedUrl.searchParams.get('ascending')).toBe('false');
  });

  it('fetchMarkets accepts wrapped payloads from the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      markets: [makeMarket({ id: 'wrapped-market' })]
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    const markets = await client.fetchMarkets();

    expect(markets.map((market) => market.id)).toEqual(['wrapped-market']);
  });

  it('fetchMarkets throws on non-ok responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad', {
      status: 502,
      statusText: 'Bad Gateway'
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    await expect(client.fetchMarkets()).rejects.toThrow('Polymarket API error: 502 Bad Gateway');
  });

  it('fetchMarkets falls back to an empty list when wrapped payloads omit markets', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    await expect(client.fetchMarkets()).resolves.toEqual([]);
  });

  it('fetchMarketById returns null for 404 responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    await expect(client.fetchMarketById('missing-market')).resolves.toBeNull();
  });

  it('fetchMarketById throws on non-404 failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad', {
      status: 500,
      statusText: 'Internal Server Error'
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    await expect(client.fetchMarketById('broken-market')).rejects.toThrow(
      'Polymarket API error: 500 Internal Server Error'
    );
  });

  it('fetchMarketById translates aborts into timeout errors', async () => {
    vi.useFakeTimers();

    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const fetchMock = vi.fn((_url, init?: RequestInit) => new Promise((_resolve, reject) => {
      const signal = init?.signal as AbortSignal;
      signal.addEventListener('abort', () => reject(abortError), { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    const request = client.fetchMarketById('slow-market');
    const assertion = expect(request).rejects.toThrow(
      'Polymarket API timeout after 15000ms for market slow-market'
    );

    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
  });

  it('simplifyMarket normalizes binary markets from JSON-string fields', async () => {
    const client = await import('@/lib/polymarket/client');
    const simplified = client.simplifyMarket(makeMarket({
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.42","0.58"]',
      events: [{ id: 'event-1', title: 'Event', slug: 'event-slug', markets: [] }]
    }));

    expect(simplified.market_type).toBe('binary');
    expect(simplified.current_price).toBeCloseTo(0.42);
    expect(simplified.current_prices).toBeNull();
    expect(simplified.event_slug).toBe('event-slug');
  });

  it('simplifyMarket builds multi-outcome price maps and resolves status from decisive prices', async () => {
    const client = await import('@/lib/polymarket/client');
    const simplified = client.simplifyMarket(makeMarket({
      closed: true,
      outcomes: ['Alice', 'Bob', 'Carol'],
      outcomePrices: ['1', '0', '0'],
      question: 'Who wins?'
    }));

    expect(simplified.market_type).toBe('multi_outcome');
    expect(simplified.outcomes).toBe(JSON.stringify(['Alice', 'Bob', 'Carol']));
    expect(simplified.current_prices).toBe(JSON.stringify({ Alice: 1, Bob: 0, Carol: 0 }));
    expect(simplified.status).toBe('resolved');
  });

  it('simplifyMarket falls back to token data when outcome JSON cannot be parsed', async () => {
    const client = await import('@/lib/polymarket/client');
    const simplified = client.simplifyMarket(makeMarket({
      outcomes: '[bad json',
      outcomePrices: '[bad json',
      tokens: [
        { outcome: 'Yes', token_id: 'yes', price: '0.7' },
        { outcome: 'No', token_id: 'no', price: '0.3' }
      ]
    }));

    expect(simplified.market_type).toBe('binary');
    expect(simplified.current_price).toBeCloseTo(0.7);
  });

  it('simplifyMarket warns and uses a far-future close date when the API omits one', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-03-05T00:00:00.000Z').getTime());

    const client = await import('@/lib/polymarket/client');
    const simplified = client.simplifyMarket(makeMarket({
      end_date_iso: undefined,
      endDateIso: undefined,
      endDate: undefined
    }));

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(simplified.close_date).toBe('2027-03-05T00:00:00.000Z');

    dateNowSpy.mockRestore();
  });

  it('checkResolution returns false for unresolved markets without decisive prices', async () => {
    const client = await import('@/lib/polymarket/client');
    expect(client.checkResolution(makeMarket({
      closed: false,
      resolved: false,
      outcomePrices: '["0.55","0.45"]'
    }))).toEqual({ resolved: false });
  });

  it('checkResolution prefers winner tokens when available', async () => {
    const client = await import('@/lib/polymarket/client');
    expect(client.checkResolution(makeMarket({
      resolved: true,
      tokens: [
        { outcome: 'Yes', token_id: 'yes', price: '1', winner: true },
        { outcome: 'No', token_id: 'no', price: '0' }
      ]
    }))).toEqual({ resolved: true, winner: 'YES' });
  });

  it('checkResolution falls back to token prices when winner flags are missing', async () => {
    const client = await import('@/lib/polymarket/client');
    expect(client.checkResolution(makeMarket({
      resolved: true,
      tokens: [
        { outcome: 'Alpha', token_id: 'alpha', price: '0.99' },
        { outcome: 'Beta', token_id: 'beta', price: '0.01' }
      ]
    }))).toEqual({ resolved: true, winner: 'ALPHA' });
  });

  it('checkResolution falls back to outcomePrices and reports unknown winners when parsing fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = await import('@/lib/polymarket/client');

    expect(client.checkResolution(makeMarket({
      resolved: true,
      outcomes: '["Yes","No"]',
      outcomePrices: '["1","0"]'
    }))).toEqual({ resolved: true, winner: 'YES' });

    expect(client.checkResolution(makeMarket({
      id: 'broken-resolution',
      resolved: true,
      outcomes: '[bad json',
      outcomePrices: '[bad json'
    }))).toEqual({
      resolved: true,
      winner: 'UNKNOWN',
      error: 'Winner could not be determined from market data'
    });

    expect(errorSpy).toHaveBeenCalled();
  });

  it('checkResolution returns UNKNOWN when outcome arrays are unusable', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = await import('@/lib/polymarket/client');

    expect(client.checkResolution(makeMarket({
      id: 'missing-outcomes',
      resolved: true,
      tokens: [],
      outcomes: { bad: true } as unknown as string[],
      outcomePrices: ['1', '0']
    }))).toEqual({
      resolved: true,
      winner: 'UNKNOWN',
      error: 'Winner could not be determined from market data'
    });

    expect(client.checkResolution(makeMarket({
      id: 'no-outcome-prices',
      resolved: true,
      tokens: undefined,
      outcomePrices: undefined
    }))).toEqual({
      resolved: true,
      winner: 'UNKNOWN',
      error: 'Winner could not be determined from market data'
    });

    expect(errorSpy).toHaveBeenCalled();
  });

  it('fetchEvents and fetchEventBySlug handle success and 404 cases', async () => {
    const event: PolymarketEvent = {
      id: 'event-1',
      title: 'Main event',
      slug: 'main-event',
      markets: []
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([event]))
      .mockResolvedValueOnce(jsonResponse(event))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    await expect(client.fetchEvents(20, 10)).resolves.toEqual([event]);
    await expect(client.fetchEventBySlug('main-event')).resolves.toEqual(event);
    await expect(client.fetchEventBySlug('missing-event')).resolves.toBeNull();
  });

  it('fetchEvents returns an empty array for wrapped non-array responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ events: [] }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    await expect(client.fetchEvents()).resolves.toEqual([]);
  });

  it('fetchEventBySlug throws on non-404 failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad', {
      status: 500,
      statusText: 'Broken'
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    await expect(client.fetchEventBySlug('broken-event')).rejects.toThrow(
      'Polymarket API error: 500 Broken'
    );
  });

  it('fetchMarketsFromEvents filters to active open markets with volume', async () => {
    const events: PolymarketEvent[] = [{
      id: 'event-1',
      title: 'Event 1',
      slug: 'event-1',
      markets: [
        makeMarket({ id: 'market-pass', active: true, closed: false, volumeNum: 10 }),
        makeMarket({ id: 'market-no-volume', active: true, closed: false, volumeNum: 0 }),
        makeMarket({ id: 'market-closed', active: true, closed: true, volumeNum: 100 }),
        makeMarket({ id: 'market-inactive', active: false, closed: false, volumeNum: 100 })
      ]
    }];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(events));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    const markets = await client.fetchMarketsFromEvents(10);

    expect(markets.map((market) => market.id)).toEqual(['market-pass']);
  });

  it('fetchMarketsFromEvents ignores events without market arrays', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([
      { id: 'event-1', title: 'Event 1', slug: 'event-1', markets: undefined },
      { id: 'event-2', title: 'Event 2', slug: 'event-2' }
    ]));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    await expect(client.fetchMarketsFromEvents(5)).resolves.toEqual([]);
  });

  it('fetchTopMarkets combines sources, deduplicates ids, and sorts by numeric volume', async () => {
    const directMarkets = [
      makeMarket({ id: 'market-b', volumeNum: 25, outcomes: '["Yes","No"]', outcomePrices: '["0.4","0.6"]' }),
      makeMarket({ id: 'market-a', volumeNum: 50, outcomes: '["Yes","No"]', outcomePrices: '["0.7","0.3"]' })
    ];
    const eventMarkets = [{
      id: 'event-1',
      title: 'Event 1',
      slug: 'event-1',
      markets: [
        makeMarket({ id: 'market-a', volumeNum: 50, outcomes: '["Yes","No"]', outcomePrices: '["0.7","0.3"]' }),
        makeMarket({ id: 'market-c', volumeNum: undefined, volume: '40', outcomes: ['Alice', 'Bob'], outcomePrices: ['0.6', '0.4'] })
      ]
    }] satisfies PolymarketEvent[];

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(directMarkets))
      .mockResolvedValueOnce(jsonResponse(eventMarkets));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    const markets = await client.fetchTopMarkets(3);

    expect(markets.map((market) => market.polymarket_id)).toEqual(['market-a', 'market-c', 'market-b']);
  });

  it('fetchTopMarkets uses conditionId fallback and skips missing identifiers', async () => {
    const directMarkets = [
      makeMarket({
        id: '',
        conditionId: 'condition-market',
        volumeNum: undefined,
        volume: '40',
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.6","0.4"]'
      }),
      makeMarket({
        id: '',
        conditionId: undefined,
        volumeNum: 50,
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.3","0.7"]'
      })
    ];

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(directMarkets))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    const markets = await client.fetchTopMarkets(5);

    expect(markets.map((market) => market.polymarket_id)).toEqual(['condition-market']);
  });

  it('fetchTopMarkets handles markets without volume metadata', async () => {
    const directMarkets = [
      makeMarket({
        id: 'market-no-volume',
        volumeNum: undefined,
        volume: undefined,
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.5","0.5"]'
      }),
      makeMarket({
        id: 'market-volume-string',
        volumeNum: undefined,
        volume: '2',
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.4","0.6"]'
      }),
      makeMarket({
        id: 'market-with-volume',
        volumeNum: 10,
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.6","0.4"]'
      })
    ];

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(directMarkets))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    const markets = await client.fetchTopMarkets(5);

    expect(markets.map((market) => market.polymarket_id)).toEqual([
      'market-with-volume',
      'market-volume-string',
      'market-no-volume'
    ]);
  });

  it('fetchTopMarkets sorts correctly when the comparison starts with a no-volume market', async () => {
    const directMarkets = [
      makeMarket({
        id: 'market-volume-only',
        volumeNum: undefined,
        volume: '3',
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.7","0.3"]'
      }),
      makeMarket({
        id: 'market-no-volume-second',
        volumeNum: undefined,
        volume: undefined,
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.5","0.5"]'
      })
    ];

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(directMarkets))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    const markets = await client.fetchTopMarkets(5);

    expect(markets.map((market) => market.polymarket_id)).toEqual([
      'market-volume-only',
      'market-no-volume-second'
    ]);
  });

  it('checkMultipleResolutions batches requests and skips failed fetches', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn((url: string) => {
      const id = url.split('/').pop();

      if (id === 'market-error') {
        return Promise.reject(new Error('network down'));
      }

      return Promise.resolve(jsonResponse(makeMarket({
        id,
        resolved: true,
        tokens: [
          { outcome: 'Yes', token_id: `${id}-yes`, price: '1', winner: true },
          { outcome: 'No', token_id: `${id}-no`, price: '0' }
        ]
      })));
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    const promise = client.checkMultipleResolutions([
      'market-1',
      'market-2',
      'market-3',
      'market-4',
      'market-5',
      'market-6',
      'market-7',
      'market-8',
      'market-9',
      'market-10',
      'market-11',
      'market-error'
    ]);

    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results.get('market-1')).toEqual({ resolved: true, winner: 'YES' });
    expect(results.get('market-11')).toEqual({ resolved: true, winner: 'YES' });
    expect(results.has('market-error')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });

  it('checkMultipleResolutions skips null market lookups without failing the batch', async () => {
    const fetchMock = vi.fn((url: string) => {
      const id = url.split('/').pop();

      if (id === 'missing-market') {
        return Promise.resolve(new Response(null, { status: 404 }));
      }

      return Promise.resolve(jsonResponse(makeMarket({
        id,
        resolved: true,
        tokens: [
          { outcome: 'Yes', token_id: `${id}-yes`, price: '1', winner: true },
          { outcome: 'No', token_id: `${id}-no`, price: '0' }
        ]
      })));
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const client = await import('@/lib/polymarket/client');
    const results = await client.checkMultipleResolutions(['market-1', 'missing-market']);

    expect(results.get('market-1')).toEqual({ resolved: true, winner: 'YES' });
    expect(results.has('missing-market')).toBe(false);
  });

  it('covers remaining simplify and resolution edge paths', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = await import('@/lib/polymarket/client');

    const invalidBinary = client.simplifyMarket(makeMarket({
      outcomes: ['Yes', 'No'],
      outcomePrices: ['1.5', '0']
    }));
    const sparseMulti = client.simplifyMarket(makeMarket({
      outcomes: ['One', '', 'Three'],
      outcomePrices: ['0.4', '0.5']
    }));
    const resolvedWithExplicitDate = client.simplifyMarket(makeMarket({
      id: '',
      question: '',
      conditionId: 'condition-only',
      resolved: true,
      outcomes: undefined,
      outcomePrices: undefined,
      end_date_iso: '2026-08-01T00:00:00.000Z',
      volumeNum: undefined,
      volume: undefined,
      liquidity: undefined
    }));
    const unknownWithMissingOutcomes = client.checkResolution(makeMarket({
      id: 'missing-outcomes',
      resolved: true,
      tokens: [],
      outcomes: undefined,
      outcomePrices: '["1","0"]'
    }));

    expect(invalidBinary.current_price).toBeNull();
    expect(sparseMulti.current_prices).toBe(JSON.stringify({ One: 0.4 }));
    expect(resolvedWithExplicitDate).toMatchObject({
      polymarket_id: 'condition-only',
      question: 'Unknown question',
      close_date: '2026-08-01T00:00:00.000Z',
      status: 'resolved',
      current_price: null,
      current_prices: null,
      volume: null,
      liquidity: null
    });
    expect(unknownWithMissingOutcomes).toEqual({
      resolved: true,
      winner: 'UNKNOWN',
      error: 'Winner could not be determined from market data'
    });
    expect(detectDecisivePrices(makeMarket({ closed: true, outcomePrices: undefined }))).toBe(false);
    expect(detectDecisivePrices(makeMarket({ closed: true, outcomePrices: '["0.99"]' }))).toBe(false);
    expect(detectDecisivePrices(makeMarket({ closed: true, outcomePrices: '[bad json' }))).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('covers remaining direct resolution and transformer branches', async () => {
    const client = await import('@/lib/polymarket/client');

    expect(detectDecisivePrices(makeMarket({
      closed: true,
      outcomePrices: [1, 0] as unknown as string[]
    }))).toBe(true);

    const fallbackWithoutTokens = client.simplifyMarket(makeMarket({
      id: '',
      conditionId: undefined,
      closed: true,
      resolved: false,
      outcomes: '[bad json',
      outcomePrices: '[bad json',
      tokens: undefined,
      liquidity: '42'
    }));
    const invalidMulti = client.simplifyMarket(makeMarket({
      outcomes: ['Alpha', 'Beta'],
      outcomePrices: ['2', '-1']
    }));

    expect(fallbackWithoutTokens).toMatchObject({
      polymarket_id: '',
      status: 'closed',
      current_prices: null,
      liquidity: 42
    });
    expect(invalidMulti.current_prices).toBeNull();
  });

  it('covers array-based resolution paths and empty token prices', async () => {
    const client = await import('@/lib/polymarket/client');

    expect(client.checkResolution(makeMarket({
      resolved: true,
      tokens: [
        { outcome: 'No', token_id: 'no', price: '' },
        { outcome: 'Yes', token_id: 'yes', price: '1' }
      ]
    }))).toEqual({ resolved: true, winner: 'YES' });

    expect(client.checkResolution(makeMarket({
      resolved: true,
      tokens: [],
      outcomes: ['Left', 'Right'],
      outcomePrices: [0, 1] as unknown as string[]
    }))).toEqual({ resolved: true, winner: 'RIGHT' });

    expect(client.simplifyMarket(makeMarket({
      outcomes: ['Yes', 'No'],
      outcomePrices: ['', '1']
    })).current_price).toBeNull();
  });
});
