import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Polymarket CLOB client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('returns an empty midpoint map without calling CLOB when no token ids are provided', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { fetchClobMidpoints } = await import('@/lib/polymarket/clob');
    const prices = await fetchClobMidpoints(['', '']);

    expect(prices.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches midpoint batches, dedupes tokens, and ignores invalid unit prices', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      new Response(JSON.stringify({ yes: '0.2', no: 1, bad: '1.2' }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { fetchClobMidpoints } = await import('@/lib/polymarket/clob');
    const prices = await fetchClobMidpoints(['yes', 'yes', 'no', 'bad', '']);

    expect(prices.get('yes')).toBe(0.2);
    expect(prices.get('no')).toBe(1);
    expect(prices.has('bad')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual([
      { token_id: 'yes' },
      { token_id: 'no' },
      { token_id: 'bad' }
    ]);
  });

  it('falls back to per-token midpoint requests when the batch endpoint fails', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/midpoints')) {
        return new Response('unavailable', { status: 503, statusText: 'Service Unavailable' });
      }
      if (url.includes('token_id=ok')) {
        return new Response(JSON.stringify({ mid: '0.33' }), { status: 200 });
      }
      if (url.includes('token_id=bad')) {
        return new Response('bad token', { status: 500 });
      }
      if (url.includes('token_id=invalid')) {
        return new Response(JSON.stringify({ mid: -0.1 }), { status: 200 });
      }
      throw new Error('network down');
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchClobMidpoints } = await import('@/lib/polymarket/clob');
    const prices = await fetchClobMidpoints(['ok', 'bad', 'invalid', 'throws']);

    expect(prices.get('ok')).toBe(0.33);
    expect(prices.size).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('returns the nearest valid historical price inside the requested window', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      new Response(JSON.stringify({
        history: [
          { t: 1_777_766_400 - 901, p: '0.11' },
          { t: 1_777_766_400 - 60, p: '0.45' },
          { t: 1_777_766_400 + 30, p: '0.55' },
          { t: 1_777_766_400 + 120, p: '0.65' },
          { t: 1_777_766_400 + 901, p: '0.99' }
        ]
      }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { fetchNearestClobHistoryPrice } = await import('@/lib/polymarket/clob');
    const price = await fetchNearestClobHistoryPrice({
      tokenId: 'token-1',
      timestamp: '2026-05-03 00:00:00',
      maxDistanceSeconds: 900
    });

    expect(price).toBe(0.55);
    expect(String(fetchMock.mock.calls[0]![0])).toContain('fidelity=1');
  });

  it('returns null for unavailable or unusable historical CLOB prices', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ history: [{ t: 1_777_766_400, p: 'oops' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchNearestClobHistoryPrice } = await import('@/lib/polymarket/clob');

    await expect(fetchNearestClobHistoryPrice({
      tokenId: 'token-1',
      timestamp: '2026-05-03 00:00:00'
    })).resolves.toBeNull();
    await expect(fetchNearestClobHistoryPrice({
      tokenId: 'token-1',
      timestamp: '2026-05-03 00:00:00',
      maxDistanceSeconds: 60
    })).resolves.toBeNull();
    await expect(fetchNearestClobHistoryPrice({
      tokenId: 'token-1',
      timestamp: '2026-05-03 00:00:00'
    })).resolves.toBeNull();
  });
});
