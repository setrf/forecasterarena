import type { MarketResolution, PolymarketMarket } from './types';

export function detectDecisivePrices(market: PolymarketMarket): boolean {
  if (!market.closed) {
    return false;
  }

  try {
    if (!market.outcomePrices) {
      return false;
    }

    const prices = typeof market.outcomePrices === 'string'
      ? JSON.parse(market.outcomePrices)
      : market.outcomePrices;

    if (!Array.isArray(prices) || prices.length < 2) {
      return false;
    }

    const numericPrices = prices.map((price: string | number) => parseFloat(String(price)));
    const hasWinner = numericPrices.some((price: number) => price >= 0.99);
    const hasLoser = numericPrices.some((price: number) => price <= 0.01);

    return hasWinner && hasLoser;
  } catch {
    return false;
  }
}

function resolveWinnerFromTokens(market: PolymarketMarket): string | undefined {
  if (!market.tokens || !Array.isArray(market.tokens) || market.tokens.length === 0) {
    return undefined;
  }

  const winnerToken = market.tokens.find(token => token.winner === true);
  if (winnerToken?.outcome) {
    return winnerToken.outcome.toUpperCase();
  }

  const winnerByPrice = market.tokens.find(token => {
    const price = parseFloat(token.price || '0');
    return price === 1 || price >= 0.99;
  });

  return winnerByPrice?.outcome?.toUpperCase();
}

function resolveWinnerFromOutcomePrices(market: PolymarketMarket): string | undefined {
  if (!market.outcomePrices) {
    return undefined;
  }

  try {
    const outcomes = typeof market.outcomes === 'string'
      ? JSON.parse(market.outcomes)
      : market.outcomes || [];
    const prices = typeof market.outcomePrices === 'string'
      ? JSON.parse(market.outcomePrices)
      : market.outcomePrices;

    if (!Array.isArray(outcomes) || !Array.isArray(prices)) {
      return undefined;
    }

    for (let i = 0; i < prices.length; i++) {
      const price = parseFloat(prices[i]);
      if (price === 1 || price >= 0.99) {
        const winner = outcomes[i];
        if (winner) {
          return String(winner).toUpperCase();
        }
      }
    }
  } catch (error) {
    console.error('Error parsing outcomePrices for resolution:', error);
  }

  return undefined;
}

export function checkResolution(market: PolymarketMarket): MarketResolution {
  const hasDecisivePrices = detectDecisivePrices(market);

  if (!market.resolved && !hasDecisivePrices) {
    return { resolved: false };
  }

  const tokenWinner = resolveWinnerFromTokens(market);
  if (tokenWinner) {
    return { resolved: true, winner: tokenWinner };
  }

  const outcomePriceWinner = resolveWinnerFromOutcomePrices(market);
  if (outcomePriceWinner) {
    return { resolved: true, winner: outcomePriceWinner };
  }

  console.error(`Market ${market.id} is resolved but winner could not be determined`);
  return {
    resolved: true,
    winner: 'UNKNOWN',
    error: 'Winner could not be determined from market data'
  };
}
