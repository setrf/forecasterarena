/**
 * Retroactive Snapshot Correction
 *
 * Problem: Markets were resolved late (Dec 31) but closed much earlier (Dec 7-30).
 * Historical snapshots between market close and resolution date are incorrect
 * because they used mark-to-market valuations instead of settlement values.
 *
 * Fix: For each historical snapshot, recalculate portfolio values using:
 * - Settlement value for positions in markets that had CLOSED by that snapshot time
 * - Mark-to-market for positions in markets that were still active
 *
 * Run with: npx tsx scripts/retroactive-snapshot-fix.ts
 */

import { getDb } from '../lib/db/index';

interface Position {
  id: string;
  agent_id: string;
  market_id: string;
  side: string;
  shares: number;
  total_cost: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

interface Market {
  id: string;
  close_date: string;
  status: string;
  resolution_outcome: string | null;
  current_price: number | null;
}

interface Snapshot {
  id: string;
  agent_id: string;
  snapshot_timestamp: string;
  cash_balance: number;
  positions_value: number;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
}

const INITIAL_BALANCE = 10000;

/**
 * Calculate settlement value for a position
 */
function calculateSettlementValue(
  shares: number,
  side: string,
  winningOutcome: string
): number {
  // Position wins if side matches outcome
  const won = side.toUpperCase() === winningOutcome.toUpperCase();
  return won ? shares : 0;
}

/**
 * Calculate mark-to-market value for a position
 */
function calculateMarkToMarket(
  shares: number,
  side: string,
  currentPrice: number | null
): number {
  if (currentPrice === null) return 0;

  // For YES positions, value = shares × price
  // For NO positions, value = shares × (1 - price)
  if (side.toUpperCase() === 'YES') {
    return shares * currentPrice;
  } else {
    return shares * (1 - currentPrice);
  }
}

async function main() {
  console.log('🔄 Starting retroactive snapshot correction...\n');

  const db = getDb();

  // Step 1: Get all snapshots that need correction
  // These are snapshots from before today that may have incorrect values
  const snapshots = db.prepare(`
    SELECT id, agent_id, snapshot_timestamp, cash_balance, positions_value,
           total_value, total_pnl, total_pnl_percent
    FROM portfolio_snapshots
    WHERE date(snapshot_timestamp) < date('now')
    ORDER BY agent_id, snapshot_timestamp
  `).all() as Snapshot[];

  console.log(`📊 Found ${snapshots.length} historical snapshots to review\n`);

  // Step 2: Get all positions (we'll need to look up which were active at each snapshot time)
  const allPositions = db.prepare(`
    SELECT id, agent_id, market_id, side, shares, total_cost, status, opened_at, closed_at
    FROM positions
  `).all() as Position[];

  console.log(`📈 Loaded ${allPositions.length} positions\n`);

  // Step 3: Get all markets with their resolution data
  const allMarkets = db.prepare(`
    SELECT id, close_date, status, resolution_outcome, current_price
    FROM markets
  `).all() as Market[];

  const marketsById = new Map(allMarkets.map(m => [m.id, m]));
  console.log(`🏛️  Loaded ${allMarkets.length} markets\n`);

  // Step 4: Process each snapshot
  const updateSnapshot = db.prepare(`
    UPDATE portfolio_snapshots
    SET positions_value = ?, total_value = ?, total_pnl = ?, total_pnl_percent = ?
    WHERE id = ?
  `);

  let corrected = 0;
  let unchanged = 0;
  let agentCount = 0;
  let lastAgentId = '';

  for (const snapshot of snapshots) {
    if (snapshot.agent_id !== lastAgentId) {
      agentCount++;
      lastAgentId = snapshot.agent_id;
      if (agentCount <= 7) {
        console.log(`\n👤 Processing agent ${agentCount}/28...`);
      }
    }

    const snapshotTime = snapshot.snapshot_timestamp;

    // Find positions that were OPEN at this snapshot time
    const activePositions = allPositions.filter(p => {
      if (p.agent_id !== snapshot.agent_id) return false;

      // Position must have been opened before or at snapshot time
      if (p.opened_at > snapshotTime) return false;

      // Position must not have been closed before snapshot time
      // (status='settled' with closed_at before snapshot means it wasn't active)
      if (p.closed_at && p.closed_at <= snapshotTime) return false;

      return true;
    });

    // Calculate correct positions value
    let correctPositionsValue = 0;

    for (const position of activePositions) {
      const market = marketsById.get(position.market_id);
      if (!market) continue;

      // Key question: Had this market CLOSED by the snapshot time?
      const marketClosedBySnapshot = market.close_date <= snapshotTime;

      if (marketClosedBySnapshot && market.resolution_outcome) {
        // Market was closed - use settlement value
        const settlementValue = calculateSettlementValue(
          position.shares,
          position.side,
          market.resolution_outcome
        );
        correctPositionsValue += settlementValue;
      } else {
        // Market was still active - use mark-to-market
        const mtmValue = calculateMarkToMarket(
          position.shares,
          position.side,
          market.current_price
        );
        correctPositionsValue += mtmValue;
      }
    }

    // Calculate correct totals
    const correctTotalValue = snapshot.cash_balance + correctPositionsValue;
    const correctPnl = correctTotalValue - INITIAL_BALANCE;
    const correctPnlPercent = (correctPnl / INITIAL_BALANCE) * 100;

    // Check if correction is needed (with small tolerance for floating point)
    const needsCorrection =
      Math.abs(correctPositionsValue - snapshot.positions_value) > 0.01 ||
      Math.abs(correctTotalValue - snapshot.total_value) > 0.01;

    if (needsCorrection) {
      updateSnapshot.run(
        correctPositionsValue,
        correctTotalValue,
        correctPnl,
        correctPnlPercent,
        snapshot.id
      );
      corrected++;
    } else {
      unchanged++;
    }
  }

  console.log('\n\n✅ Retroactive correction complete!');
  console.log(`📊 Snapshots corrected: ${corrected}`);
  console.log(`📊 Snapshots unchanged: ${unchanged}`);
  console.log(`📊 Total processed: ${snapshots.length}`);

  // Verification
  console.log('\n🔍 Verification - sample of corrected snapshots:');
  const sampleCorrected = db.prepare(`
    SELECT
      date(ps.snapshot_timestamp) as date,
      m.display_name as model,
      printf('%.2f', ps.total_value) as total_value,
      printf('%.2f', ps.total_pnl) as pnl
    FROM portfolio_snapshots ps
    JOIN agents a ON ps.agent_id = a.id
    JOIN models m ON a.model_id = m.id
    WHERE a.cohort_id = (SELECT id FROM cohorts WHERE cohort_number = 1)
    ORDER BY ps.snapshot_timestamp DESC
    LIMIT 14
  `).all();

  console.table(sampleCorrected);
}

main().catch(error => {
  console.error('❌ Correction failed:', error);
  process.exit(1);
});
