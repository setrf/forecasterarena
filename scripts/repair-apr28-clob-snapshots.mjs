import Database from 'better-sqlite3';
import path from 'node:path';

const INITIAL_BALANCE = 10000;
const START = '2026-04-28 11:50:00';
const END = '2026-04-28 12:50:59';
const apply = process.argv.includes('--apply');
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'forecaster.db');
const gammaTokenCache = new Map();

function parseJsonArray(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function gammaTokenMetadata(position) {
  if (gammaTokenCache.has(position.polymarket_id)) {
    return gammaTokenCache.get(position.polymarket_id);
  }

  try {
    const response = await fetch(
      `https://gamma-api.polymarket.com/markets/${encodeURIComponent(position.polymarket_id)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) {
      return { tokenIds: [], outcomes: parseJsonArray(position.outcomes) };
    }

    const payload = await response.json();
    const metadata = {
      tokenIds: parseJsonArray(payload.clobTokenIds),
      outcomes: parseJsonArray(payload.outcomes)
    };
    gammaTokenCache.set(position.polymarket_id, metadata);
    return metadata;
  } catch {
    return { tokenIds: [], outcomes: parseJsonArray(position.outcomes) };
  }
}

async function tokenForPosition(position) {
  const localTokenIds = parseJsonArray(position.clob_token_ids);
  const metadata = localTokenIds.length > 0
    ? { tokenIds: localTokenIds, outcomes: parseJsonArray(position.outcomes) }
    : await gammaTokenMetadata(position);

  const tokenIds = metadata.tokenIds;
  if (position.market_type === 'binary') {
    return tokenIds[0] || null;
  }

  const index = metadata.outcomes.findIndex((outcome) => outcome === position.side);
  return index >= 0 ? tokenIds[index] || null : null;
}

async function fetchNearestPrice(tokenId, timestamp) {
  const target = Math.floor(new Date(timestamp.replace(' ', 'T') + 'Z').getTime() / 1000);
  const params = new URLSearchParams({
    market: tokenId,
    startTs: String(target - 900),
    endTs: String(target + 900),
    fidelity: '1'
  });
  const response = await fetch(`https://clob.polymarket.com/prices-history?${params}`);
  if (!response.ok) return null;

  const payload = await response.json();
  const points = (payload.history || [])
    .filter((point) => point.t >= target - 900 && point.t <= target + 900);
  let nearest = null;

  for (const point of points) {
    if (!nearest || Math.abs(point.t - target) < Math.abs(nearest.t - target)) {
      nearest = point;
    }
  }

  if (!nearest) return null;
  const price = Number(nearest.p);
  return Number.isFinite(price) && price >= 0 && price <= 1 ? price : null;
}

function valuePosition(position, price) {
  if (position.market_type === 'binary') {
    return position.side.toUpperCase() === 'NO'
      ? position.shares_at_ts * (1 - price)
      : position.shares_at_ts * price;
  }

  return position.shares_at_ts * price;
}

const db = new Database(dbPath);
const snapshots = db.prepare(`
  SELECT id, agent_id, snapshot_timestamp, cash_balance, positions_value, total_value
  FROM portfolio_snapshots
  WHERE snapshot_timestamp BETWEEN ? AND ?
  ORDER BY snapshot_timestamp, agent_id
`).all(START, END);
const getPositions = db.prepare(`
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
`);
const updateSnapshot = db.prepare(`
  UPDATE portfolio_snapshots
  SET positions_value = ?, total_value = ?, total_pnl = ?, total_pnl_percent = ?
  WHERE id = ?
`);

const rows = [];
let skipped = 0;
let maxDelta = 0;

for (const snapshot of snapshots) {
  const positions = getPositions.all(
    snapshot.snapshot_timestamp,
    snapshot.agent_id,
    snapshot.snapshot_timestamp,
    snapshot.snapshot_timestamp
  );
  let positionsValue = 0;
  let missing = false;

  for (const position of positions) {
    const tokenId = await tokenForPosition(position);
    const price = tokenId
      ? await fetchNearestPrice(tokenId, snapshot.snapshot_timestamp)
      : null;

    if (price === null) {
      missing = true;
      break;
    }

    positionsValue += valuePosition(position, price);
  }

  if (missing) {
    skipped += 1;
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

  if (apply) {
    updateSnapshot.run(positionsValue, totalValue, totalPnl, totalPnlPercent, snapshot.id);
  }
}

if (apply && rows.length > 0) {
  db.prepare('DELETE FROM performance_chart_cache').run();
  db.prepare(`
    INSERT INTO system_logs (id, event_type, event_data, severity)
    VALUES (?, ?, ?, ?)
  `).run(
    `repair-apr28-${Date.now()}`,
    'apr28_clob_snapshot_repair',
    JSON.stringify({
      start: START,
      end: END,
      snapshots_changed: rows.length,
      snapshots_skipped: skipped,
      max_delta: maxDelta
    }),
    'warning'
  );
}

console.log(JSON.stringify({
  apply,
  database_path: dbPath,
  start: START,
  end: END,
  snapshots_checked: snapshots.length,
  snapshots_changed: rows.length,
  snapshots_skipped: skipped,
  max_delta: maxDelta,
  rows
}, null, 2));

db.close();
