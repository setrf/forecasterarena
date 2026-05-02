import type { Market } from '@/lib/types';
import { fetchClobMidpoints } from '@/lib/polymarket/clob';
import { fetchMarketById } from '@/lib/polymarket/client';

const GAMMA_CLOB_DIFF_THRESHOLD = 0.05;

export type MarketTokenMetadata = {
  tokenIds: string[];
  outcomes: string[];
  serializedTokenIds: string | null;
};

export type ValidatedMarketPrice =
  | {
      marketId: string;
      source: 'clob';
      validationStatus: 'accepted' | 'accepted_with_gamma_disagreement';
      yesPrice?: number;
      outcomePrices?: Record<string, number>;
      gammaPrice: number | null;
      gammaPrices: string | null;
      clobTokenIds: string | null;
      anomalyReason: string | null;
    }
  | {
      marketId: string;
      source: 'fallback';
      validationStatus: 'fallback';
      yesPrice?: undefined;
      outcomePrices?: undefined;
      gammaPrice: number | null;
      gammaPrices: string | null;
      clobTokenIds: string | null;
      anomalyReason: string;
    };

export function parseClobTokenIds(raw: string | string[] | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(String).filter(Boolean);
  } catch {
    return [];
  }
}

export function parseMarketOutcomes(raw: string | string[] | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map(String);
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseGammaPrices(raw: string | null): Record<string, number> | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const prices: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const price = Number(value);
      if (Number.isFinite(price) && price >= 0 && price <= 1) {
        prices[key] = price;
      }
    }
    return prices;
  } catch {
    return null;
  }
}

function localTokenMetadata(market: Market): MarketTokenMetadata {
  const tokenIds = parseClobTokenIds(market.clob_token_ids);
  return {
    tokenIds,
    outcomes: parseMarketOutcomes(market.outcomes),
    serializedTokenIds: tokenIds.length > 0 ? JSON.stringify(tokenIds) : market.clob_token_ids
  };
}

export async function getMarketTokenMetadata(
  market: Market,
  options: { hydrateMissingTokenIds?: boolean } = {}
): Promise<MarketTokenMetadata> {
  const local = localTokenMetadata(market);
  if (local.tokenIds.length > 0 || options.hydrateMissingTokenIds === false || process.env.NODE_ENV === 'test') {
    return local;
  }

  try {
    const gammaMarket = await fetchMarketById(market.polymarket_id);
    const tokenIds = parseClobTokenIds(gammaMarket?.clobTokenIds);
    if (tokenIds.length === 0) {
      return local;
    }

    const outcomes = parseMarketOutcomes(gammaMarket?.outcomes);
    return {
      tokenIds,
      outcomes: outcomes.length > 0 ? outcomes : local.outcomes,
      serializedTokenIds: JSON.stringify(tokenIds)
    };
  } catch {
    return local;
  }
}

function getBinaryYesTokenId(metadata: MarketTokenMetadata): string | null {
  return metadata.tokenIds[0] ?? null;
}

function getMultiOutcomeTokenEntries(metadata: MarketTokenMetadata): Array<{ outcome: string; tokenId: string }> {
  const { outcomes, tokenIds } = metadata;

  return outcomes
    .map((outcome, index) => ({ outcome, tokenId: tokenIds[index] }))
    .filter((entry): entry is { outcome: string; tokenId: string } => Boolean(entry.tokenId));
}

function getTokenIdsForMarket(market: Market, metadata: MarketTokenMetadata): string[] {
  if (market.market_type === 'binary') {
    const yesTokenId = getBinaryYesTokenId(metadata);
    return yesTokenId ? [yesTokenId] : [];
  }

  return getMultiOutcomeTokenEntries(metadata).map((entry) => entry.tokenId);
}

function getDiffReason(gammaPrice: number | null, clobPrice: number): string | null {
  if (gammaPrice === null || !Number.isFinite(gammaPrice)) {
    return null;
  }

  const diff = Math.abs(gammaPrice - clobPrice);
  if (diff <= GAMMA_CLOB_DIFF_THRESHOLD) {
    return null;
  }

  return `Gamma price ${gammaPrice.toFixed(4)} differs from CLOB ${clobPrice.toFixed(4)}`;
}

export async function getValidatedMarketPrices(
  markets: Market[],
  options: { hydrateMissingTokenIds?: boolean } = {}
): Promise<Map<string, ValidatedMarketPrice>> {
  const marketById = new Map(markets.map((market) => [market.id, market]));
  const metadataByMarketId = new Map<string, MarketTokenMetadata>();

  await Promise.all(markets.map(async (market) => {
    metadataByMarketId.set(market.id, await getMarketTokenMetadata(market, options));
  }));

  const tokenIds = markets.flatMap((market) =>
    getTokenIdsForMarket(market, metadataByMarketId.get(market.id) ?? localTokenMetadata(market))
  );
  const midpoints = await fetchClobMidpoints(tokenIds);
  const results = new Map<string, ValidatedMarketPrice>();

  for (const market of Array.from(marketById.values())) {
    const metadata = metadataByMarketId.get(market.id) ?? localTokenMetadata(market);
    if (market.market_type === 'binary') {
      const yesTokenId = getBinaryYesTokenId(metadata);
      const yesPrice = yesTokenId ? midpoints.get(yesTokenId) : undefined;

      if (typeof yesPrice === 'number') {
        const anomalyReason = getDiffReason(market.current_price, yesPrice);
        results.set(market.id, {
          marketId: market.id,
          source: 'clob',
          validationStatus: anomalyReason ? 'accepted_with_gamma_disagreement' : 'accepted',
          yesPrice,
          gammaPrice: market.current_price,
          gammaPrices: market.current_prices,
          clobTokenIds: metadata.serializedTokenIds,
          anomalyReason
        });
        continue;
      }

      results.set(market.id, {
        marketId: market.id,
        source: 'fallback',
        validationStatus: 'fallback',
        gammaPrice: market.current_price,
        gammaPrices: market.current_prices,
        clobTokenIds: metadata.serializedTokenIds,
        anomalyReason: yesTokenId
          ? `Missing CLOB midpoint for token ${yesTokenId}`
          : 'Missing CLOB YES token id'
      });
      continue;
    }

    const outcomePrices: Record<string, number> = {};
    for (const entry of getMultiOutcomeTokenEntries(metadata)) {
      const price = midpoints.get(entry.tokenId);
      if (typeof price === 'number') {
        outcomePrices[entry.outcome] = price;
      }
    }

    if (Object.keys(outcomePrices).length > 0) {
      const gammaPrices = parseGammaPrices(market.current_prices);
      const anomalyReason = gammaPrices
        ? Object.entries(outcomePrices)
          .map(([outcome, price]) => getDiffReason(gammaPrices[outcome] ?? null, price))
          .find(Boolean) ?? null
        : null;

      results.set(market.id, {
        marketId: market.id,
        source: 'clob',
        validationStatus: anomalyReason ? 'accepted_with_gamma_disagreement' : 'accepted',
        outcomePrices,
        gammaPrice: market.current_price,
        gammaPrices: market.current_prices,
        clobTokenIds: metadata.serializedTokenIds,
        anomalyReason
      });
      continue;
    }

    results.set(market.id, {
      marketId: market.id,
      source: 'fallback',
      validationStatus: 'fallback',
      gammaPrice: market.current_price,
      gammaPrices: market.current_prices,
      clobTokenIds: metadata.serializedTokenIds,
      anomalyReason: 'Missing CLOB outcome prices'
    });
  }

  return results;
}

export function getValidatedSidePrice(args: {
  market: Market;
  side: string;
  validatedPrice?: ValidatedMarketPrice;
}): number | null {
  const { market, side, validatedPrice } = args;
  if (!validatedPrice || validatedPrice.source !== 'clob') {
    return null;
  }

  if (market.market_type === 'binary') {
    const normalizedSide = side.toUpperCase();
    if (typeof validatedPrice.yesPrice !== 'number') {
      return null;
    }
    if (normalizedSide === 'YES') {
      return validatedPrice.yesPrice;
    }
    if (normalizedSide === 'NO') {
      return 1 - validatedPrice.yesPrice;
    }
    return null;
  }

  return validatedPrice.outcomePrices?.[side] ?? null;
}
