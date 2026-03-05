import { POLYMARKET_GAMMA_API_HOST, TOP_MARKETS_COUNT } from '../constants';
import type { PolymarketEvent, PolymarketMarket } from './types';

const JSON_HEADERS = { Accept: 'application/json' };
const POLYMARKET_TIMEOUT_MS = 15000;

function buildGammaUrl(pathname: string, searchParams?: Record<string, string>): string {
  const url = new URL(`${POLYMARKET_GAMMA_API_HOST}${pathname}`);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

async function fetchGammaJsonOrThrow<T>(
  pathname: string,
  searchParams?: Record<string, string>
): Promise<T> {
  const url = buildGammaUrl(pathname, searchParams);
  const response = await fetch(url, {
    method: 'GET',
    headers: JSON_HEADERS
  });

  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as T;
}

export async function fetchMarkets(
  limit: number = TOP_MARKETS_COUNT,
  offset: number = 0
): Promise<PolymarketMarket[]> {
  const searchParams = {
    limit: String(limit),
    offset: String(offset),
    active: 'true',
    closed: 'false',
    order: 'volumeNum',
    ascending: 'false'
  };

  const url = buildGammaUrl('/markets', searchParams);
  console.log(`Fetching markets from Polymarket: ${url}`);

  const data = await fetchGammaJsonOrThrow<PolymarketMarket[] | { markets?: PolymarketMarket[] }>(
    '/markets',
    searchParams
  );
  const markets = Array.isArray(data) ? data : data.markets || [];

  console.log(`Fetched ${markets.length} markets from Polymarket`);
  return markets;
}

export async function fetchMarketById(marketId: string): Promise<PolymarketMarket | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POLYMARKET_TIMEOUT_MS);

  try {
    const response = await fetch(buildGammaUrl(`/markets/${marketId}`), {
      method: 'GET',
      headers: JSON_HEADERS,
      signal: controller.signal
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as PolymarketMarket;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Polymarket API timeout after ${POLYMARKET_TIMEOUT_MS}ms for market ${marketId}`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchEvents(
  limit: number = 100,
  offset: number = 0
): Promise<PolymarketEvent[]> {
  const searchParams = {
    limit: String(limit),
    offset: String(offset),
    order: 'volume',
    ascending: 'false',
    closed: 'false'
  };

  const url = buildGammaUrl('/events', searchParams);
  console.log(`Fetching events from Polymarket: ${url}`);

  const data = await fetchGammaJsonOrThrow<PolymarketEvent[]>('/events', searchParams);
  return Array.isArray(data) ? data : [];
}

export async function fetchEventBySlug(slug: string): Promise<PolymarketEvent | null> {
  const response = await fetch(buildGammaUrl(`/events/slug/${slug}`), {
    method: 'GET',
    headers: JSON_HEADERS
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as PolymarketEvent;
}
