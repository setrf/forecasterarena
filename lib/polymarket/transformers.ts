import type { PolymarketMarket, SimplifiedMarket } from './types';

function parseOutcomesAndPrices(market: PolymarketMarket): {
  outcomesList: string[];
  pricesList: string[];
} {
  let outcomesList: string[] = [];
  let pricesList: string[] = [];

  try {
    if (typeof market.outcomes === 'string') {
      outcomesList = JSON.parse(market.outcomes);
    } else if (Array.isArray(market.outcomes)) {
      outcomesList = market.outcomes;
    }

    if (typeof market.outcomePrices === 'string') {
      pricesList = JSON.parse(market.outcomePrices);
    } else if (Array.isArray(market.outcomePrices)) {
      pricesList = market.outcomePrices;
    }
  } catch {
    const tokens = market.tokens || [];
    outcomesList = tokens.map(token => token.outcome).filter(Boolean);
    pricesList = tokens.map(token => token.price).filter(Boolean);
  }

  return { outcomesList, pricesList };
}

function isBinaryMarket(outcomesList: string[]): boolean {
  return outcomesList.length === 2 &&
    outcomesList.some(outcome => outcome?.toLowerCase() === 'yes') &&
    outcomesList.some(outcome => outcome?.toLowerCase() === 'no');
}

function getMarketStatus(market: PolymarketMarket, pricesList: string[]): 'active' | 'closed' | 'resolved' {
  if (market.resolved) {
    return 'resolved';
  }

  if (!market.closed) {
    return 'active';
  }

  const numericPrices = pricesList.map(price => parseFloat(String(price)));
  const hasWinner = numericPrices.some(price => price >= 0.99);
  const hasLoser = numericPrices.some(price => price <= 0.01);

  return hasWinner && hasLoser ? 'resolved' : 'closed';
}

function getCloseDate(market: PolymarketMarket): string {
  const closeDate = market.end_date_iso || market.endDateIso || market.endDate;

  if (closeDate) {
    return closeDate;
  }

  console.warn(
    `[Market ${market.id}] No close date found. Question: "${market.question?.slice(0, 50)}...". ` +
    'Using far-future date as placeholder.'
  );

  return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
}

export function simplifyMarket(market: PolymarketMarket): SimplifiedMarket {
  const { outcomesList, pricesList } = parseOutcomesAndPrices(market);
  const isBinary = isBinaryMarket(outcomesList);

  let currentPrice: number | null = null;
  let currentPrices: string | null = null;

  if (outcomesList.length > 0 && pricesList.length > 0) {
    if (isBinary) {
      const yesIndex = outcomesList.findIndex(outcome => outcome?.toLowerCase() === 'yes');

      if (yesIndex !== -1 && pricesList[yesIndex]) {
        currentPrice = parseFloat(pricesList[yesIndex]);
        if (isNaN(currentPrice) || currentPrice < 0 || currentPrice > 1) {
          currentPrice = null;
        }
      }
    } else {
      const prices: Record<string, number> = {};

      for (let i = 0; i < outcomesList.length; i++) {
        if (!outcomesList[i] || !pricesList[i]) {
          continue;
        }

        const price = parseFloat(pricesList[i]);
        if (!isNaN(price) && price >= 0 && price <= 1) {
          prices[outcomesList[i]] = price;
        }
      }

      currentPrices = Object.keys(prices).length > 0 ? JSON.stringify(prices) : null;
    }
  }

  const outcomes = !isBinary && outcomesList.length > 0
    ? JSON.stringify(outcomesList)
    : null;

  return {
    polymarket_id: market.id || market.conditionId || '',
    slug: market.slug || null,
    event_slug: market.events?.[0]?.slug || null,
    question: market.question || 'Unknown question',
    description: market.description || null,
    category: market.category || null,
    market_type: isBinary ? 'binary' : 'multi_outcome',
    outcomes,
    close_date: getCloseDate(market),
    status: getMarketStatus(market, pricesList),
    current_price: currentPrice,
    current_prices: currentPrices,
    volume: market.volumeNum ?? (market.volume ? parseFloat(String(market.volume)) : null),
    liquidity: market.liquidity ? parseFloat(String(market.liquidity)) : null
  };
}
