import type Database from 'better-sqlite3';

import { fetchNearestClobHistoryPrice } from '@/lib/polymarket/clob';
import { fetchMarketById } from '@/lib/polymarket/client';
import { parseClobTokenIds, parseMarketOutcomes } from '@/lib/pricing/marketPrices';

const INITIAL_BALANCE = 10000;
const DEFAULT_START = '2026-04-28 11:50:00';
const DEFAULT_END = '2026-04-28 12:50:59';

type RepairSnapshot = {
  id: string;
  agent_id: string;
  snapshot_timestamp: string;
  cash_balance: number;
  positions_value: number;
  total_value: number;
};

type RepairPosition = {
  id: string;
  side: string;
  market_id: string;
  polymarket_id: string;
  market_type: 'binary' | 'multi_outcome';
  outcomes: string | null;
  clob_token_ids: string | null;
  shares_at_ts: number;
};

type HistoricalPriceProvider = (args: {
  position: RepairPosition;
  timestamp: string;
}) => Promise<number | null>;

export interface RepairApr28Options {
  db: Database.Database;
  apply?: boolean;
  start?: string;
  end?: string;
  fetchHistoricalPrice?: HistoricalPriceProvider;
}

export interface RepairApr28Report {
  apply: boolean;
  start: string;
  end: string;
  snapshots_checked: number;
  snapshots_changed: number;
  snapshots_skipped: number;
  max_delta: number;
  rows: Array<{
    snapshot_id: string;
    agent_id: string;
    snapshot_timestamp: string;
    old_total_value: number;
    new_total_value: number;
    delta: number;
  }>;
}

const gammaTokenCache = new Map<string, { tokenIds: string[]; outcomes: string[] }>();

async function getTokenMetadataForPosition(
  position: RepairPosition
): Promise<{ tokenIds: string[]; outcomes: string[] }> {
  const localTokenIds = parseClobTokenIds(position.clob_token_ids);
  if (localTokenIds.length > 0) {
    return {
      tokenIds: localTokenIds,
      outcomes: parseMarketOutcomes(position.outcomes)
    };
  }

  const cached = gammaTokenCache.get(position.polymarket_id);
  if (cached) {
    return cached;
  }

  try {
    const gammaMarket = await fetchMarketById(position.polymarket_id);
    const metadata = {
      tokenIds: parseClobTokenIds(gammaMarket?.clobTokenIds),
      outcomes: parseMarketOutcomes(gammaMarket?.outcomes)
    };
    gammaTokenCache.set(position.polymarket_id, metadata);
    return metadata;
  } catch {
    return { tokenIds: [], outcomes: parseMarketOutcomes(position.outcomes) };
  }
}

async function getTokenIdForPosition(position: RepairPosition): Promise<string | null> {
  const { tokenIds, outcomes } = await getTokenMetadataForPosition(position);

  if (position.market_type === 'binary') {
    return tokenIds[0] ?? null;
  }

  const outcomeIndex = outcomes.findIndex((outcome) => outcome === position.side);
  return outcomeIndex >= 0 ? tokenIds[outcomeIndex] ?? null : null;
}

async function defaultHistoricalPriceProvider(args: {
  position: RepairPosition;
  timestamp: string;
}): Promise<number | null> {
  const tokenId = await getTokenIdForPosition(args.position);
  if (!tokenId) {
    return null;
  }

  return fetchNearestClobHistoryPrice({
    tokenId,
    timestamp: args.timestamp,
    maxDistanceSeconds: 900
  });
}

function getSnapshots(db: Database.Database, start: string, end: string): RepairSnapshot[] {
  return db.prepare(`
    SELECT id, agent_id, snapshot_timestamp, cash_balance, positions_value, total_value
    FROM portfolio_snapshots
    WHERE snapshot_timestamp BETWEEN ? AND ?
    ORDER BY snapshot_timestamp, agent_id
  `).all(start, end) as RepairSnapshot[];
}

function getActivePositionsAtSnapshot(
  db: Database.Database,
  snapshot: RepairSnapshot
): RepairPosition[] {
  return db.prepare(`
    SELECT
      p.id,
      p.side,
      p.market_id,
      m.polymarket_id,
      m.market_type,
      m.outcomes,
      m.clob_token_ids,
      SUM(CASE
        WHEN t.trade_type = 'BUY' THEN t.shares
        WHEN t.trade_type = 'SELL' THEN -t.shares
        ELSE 0
      END) AS shares_at_ts
    FROM positions p
    JOIN markets m ON m.id = p.market_id
    JOIN trades t ON t.position_id = p.id AND t.executed_at <= ?
    WHERE p.agent_id = ?
      AND p.opened_at <= ?
      AND (p.closed_at IS NULL OR p.closed_at > ?)
    GROUP BY p.id
    HAVING shares_at_ts > 0.000001
  `).all(
    snapshot.snapshot_timestamp,
    snapshot.agent_id,
    snapshot.snapshot_timestamp,
    snapshot.snapshot_timestamp
  ) as RepairPosition[];
}

function calculatePositionValue(position: RepairPosition, price: number): number {
  if (position.market_type === 'binary') {
    return position.side.toUpperCase() === 'NO'
      ? position.shares_at_ts * (1 - price)
      : position.shares_at_ts * price;
  }

  return position.shares_at_ts * price;
}

export async function repairApr28Snapshots(options: RepairApr28Options): Promise<RepairApr28Report> {
  const start = options.start ?? DEFAULT_START;
  const end = options.end ?? DEFAULT_END;
  const fetchHistoricalPrice = options.fetchHistoricalPrice ?? defaultHistoricalPriceProvider;
  const snapshots = getSnapshots(options.db, start, end);
  const updateSnapshot = options.db.prepare(`
    UPDATE portfolio_snapshots
    SET positions_value = ?, total_value = ?, total_pnl = ?, total_pnl_percent = ?
    WHERE id = ?
  `);
  const rows: RepairApr28Report['rows'] = [];
  let snapshotsSkipped = 0;
  let maxDelta = 0;

  for (const snapshot of snapshots) {
    const positions = getActivePositionsAtSnapshot(options.db, snapshot);
    let positionsValue = 0;
    let missingPrice = false;

    for (const position of positions) {
      const price = await fetchHistoricalPrice({
        position,
        timestamp: snapshot.snapshot_timestamp
      });

      if (price === null) {
        missingPrice = true;
        break;
      }

      positionsValue += calculatePositionValue(position, price);
    }

    if (missingPrice) {
      snapshotsSkipped += 1;
      continue;
    }

    const totalValue = snapshot.cash_balance + positionsValue;
    const totalPnl = totalValue - INITIAL_BALANCE;
    const totalPnlPercent = (totalPnl / INITIAL_BALANCE) * 100;
    const delta = totalValue - snapshot.total_value;

    if (Math.abs(delta) <= 0.01) {
      continue;
    }

    maxDelta = Math.max(maxDelta, Math.abs(delta));
    rows.push({
      snapshot_id: snapshot.id,
      agent_id: snapshot.agent_id,
      snapshot_timestamp: snapshot.snapshot_timestamp,
      old_total_value: snapshot.total_value,
      new_total_value: totalValue,
      delta
    });

    if (options.apply) {
      updateSnapshot.run(positionsValue, totalValue, totalPnl, totalPnlPercent, snapshot.id);
    }
  }

  if (options.apply && rows.length > 0) {
    options.db.prepare('DELETE FROM performance_chart_cache').run();
    options.db.prepare(`
      INSERT INTO system_logs (id, event_type, event_data, severity)
      VALUES (?, ?, ?, ?)
    `).run(
      `repair-apr28-${Date.now()}`,
      'apr28_clob_snapshot_repair',
      JSON.stringify({
        start,
        end,
        snapshots_changed: rows.length,
        snapshots_skipped: snapshotsSkipped,
        max_delta: maxDelta
      }),
      'warning'
    );
  }

  return {
    apply: Boolean(options.apply),
    start,
    end,
    snapshots_checked: snapshots.length,
    snapshots_changed: rows.length,
    snapshots_skipped: snapshotsSkipped,
    max_delta: maxDelta,
    rows
  };
}
