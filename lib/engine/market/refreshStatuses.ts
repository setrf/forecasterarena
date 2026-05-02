import { getDb } from '@/lib/db';
import { upsertMarket } from '@/lib/db/queries';
import { fetchMarketById, simplifyMarket } from '@/lib/polymarket/client';

type ExistingMarketForRefresh = {
  polymarket_id: string;
  status: string;
};

function getExistingMarketsForRefresh(): ExistingMarketForRefresh[] {
  const db = getDb();

  const priorityMarkets = db.prepare(`
    SELECT DISTINCT m.polymarket_id, m.status
    FROM markets m
    WHERE m.status IN ('active', 'closed')
    AND m.polymarket_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM positions p
        WHERE p.market_id = m.id AND p.status = 'open'
      )
      OR (m.status = 'active' AND julianday(m.close_date) < julianday('now'))
    )
  `).all() as ExistingMarketForRefresh[];

  const seen = new Set(priorityMarkets.map((market) => market.polymarket_id));
  const staleMarkets = db.prepare(`
    SELECT m.polymarket_id, m.status
    FROM markets m
    WHERE m.status = 'active'
      AND m.polymarket_id IS NOT NULL
      AND julianday(m.last_updated_at) < julianday('now', '-6 hours')
    ORDER BY m.last_updated_at ASC
    LIMIT 100
  `).all() as ExistingMarketForRefresh[];

  return [
    ...priorityMarkets,
    ...staleMarkets.filter((market) => !seen.has(market.polymarket_id))
  ];
}

export async function refreshExistingMarketStatuses(errors: string[]): Promise<{
  checked: number;
  statusUpdates: number;
}> {
  console.log('Checking existing markets for status updates...');

  const existingMarkets = getExistingMarketsForRefresh();
  console.log(`Found ${existingMarkets.length} existing markets to check for updates`);

  let statusUpdates = 0;

  for (const market of existingMarkets) {
    try {
      const freshData = await fetchMarketById(market.polymarket_id);
      if (!freshData) {
        continue;
      }

      const simplified = simplifyMarket(freshData);
      upsertMarket(simplified);

      if (simplified.status !== market.status) {
        statusUpdates++;
        console.log(`Status updated for ${market.polymarket_id}: ${market.status} -> ${simplified.status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Status check ${market.polymarket_id}: ${message}`);
    }
  }

  console.log(`Checked ${existingMarkets.length} markets, updated ${statusUpdates} statuses`);

  return {
    checked: existingMarkets.length,
    statusUpdates
  };
}
