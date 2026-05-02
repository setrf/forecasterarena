const POLYMARKET_CLOB_HOST = 'https://clob.polymarket.com';
const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

function parseUnitPrice(value: unknown): number | null {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0 || price > 1) {
    return null;
  }

  return price;
}

export async function fetchClobMidpoints(tokenIds: string[]): Promise<Map<string, number>> {
  const uniqueTokenIds = Array.from(new Set(tokenIds.filter(Boolean)));
  const prices = new Map<string, number>();

  if (uniqueTokenIds.length === 0) {
    return prices;
  }

  try {
    const response = await fetch(`${POLYMARKET_CLOB_HOST}/midpoints`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(uniqueTokenIds.map((tokenId) => ({ token_id: tokenId })))
    });

    if (!response.ok) {
      throw new Error(`CLOB midpoints error: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as Record<string, unknown>;
    for (const tokenId of uniqueTokenIds) {
      const price = parseUnitPrice(payload[tokenId]);
      if (price !== null) {
        prices.set(tokenId, price);
      }
    }

    return prices;
  } catch {
    await Promise.all(uniqueTokenIds.map(async (tokenId) => {
      try {
        const response = await fetch(
          `${POLYMARKET_CLOB_HOST}/midpoint?token_id=${encodeURIComponent(tokenId)}`,
          { headers: { Accept: 'application/json' } }
        );

        if (!response.ok) {
          return;
        }

        const payload = await response.json() as { mid?: unknown };
        const price = parseUnitPrice(payload.mid);
        if (price !== null) {
          prices.set(tokenId, price);
        }
      } catch {
        // Missing one CLOB token should not prevent other prices from resolving.
      }
    }));

    return prices;
  }
}

export async function fetchNearestClobHistoryPrice(args: {
  tokenId: string;
  timestamp: string;
  maxDistanceSeconds?: number;
}): Promise<number | null> {
  const targetSeconds = Math.floor(new Date(args.timestamp.replace(' ', 'T') + 'Z').getTime() / 1000);
  const maxDistanceSeconds = args.maxDistanceSeconds ?? 900;
  const params = new URLSearchParams({
    market: args.tokenId,
    startTs: String(targetSeconds - maxDistanceSeconds),
    endTs: String(targetSeconds + maxDistanceSeconds),
    fidelity: '1'
  });

  const response = await fetch(`${POLYMARKET_CLOB_HOST}/prices-history?${params}`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json() as { history?: Array<{ t: number; p: unknown }> };
  const points = (payload.history ?? [])
    .filter((point) => point.t >= targetSeconds - maxDistanceSeconds && point.t <= targetSeconds + maxDistanceSeconds);

  let nearest: { t: number; p: unknown } | null = null;
  for (const point of points) {
    if (!nearest || Math.abs(point.t - targetSeconds) < Math.abs(nearest.t - targetSeconds)) {
      nearest = point;
    }
  }

  return nearest ? parseUnitPrice(nearest.p) : null;
}
