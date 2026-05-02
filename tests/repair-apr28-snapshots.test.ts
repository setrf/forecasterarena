import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMarket,
  withDbQueryModules
} from '@/tests/helpers/db-query-test-utils';

describe('Apr 28 CLOB snapshot repair', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dry-runs, applies, invalidates chart cache, and is idempotent', async () => {
    await withDbQueryModules(async ({ agents, cohorts, db, markets, positions, snapshots, trades }) => {
      const cohort = cohorts.createCohort();
      agents.createAgentsForCohort(cohort.id);
      const agent = agents.getAgentsByCohort(cohort.id)[0]!;
      db.prepare('UPDATE agents SET cash_balance = ? WHERE id = ?').run(9000, agent.id);
      const market = createMarket(markets, {
        current_price: 0.8,
        clob_token_ids: '["yes-token","no-token"]'
      });
      const position = positions.upsertPosition(agent.id, market.id, 'YES', 100, 0.5, 50);
      const trade = trades.createTrade({
        agent_id: agent.id,
        market_id: market.id,
        position_id: position.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 100,
        price: 0.5,
        total_amount: 50
      });
      db.prepare('UPDATE trades SET executed_at = ? WHERE id = ?')
        .run('2026-04-28 11:00:00', trade.id);
      db.prepare('UPDATE positions SET opened_at = ? WHERE id = ?')
        .run('2026-04-28 11:00:00', position.id);
      snapshots.createPortfolioSnapshot({
        agent_id: agent.id,
        snapshot_timestamp: '2026-04-28 12:00:01',
        cash_balance: 9000,
        positions_value: 80,
        total_value: 9080,
        total_pnl: -920,
        total_pnl_percent: -9.2
      });
      db.prepare(`
        INSERT INTO performance_chart_cache (cache_key, range_key, payload_json, generated_at)
        VALUES ('test', '1D', '{}', '2026-04-28 12:00:00')
      `).run();

      const { repairApr28Snapshots } = await import('@/lib/maintenance/repairApr28Snapshots');
      const priceProvider = async () => 0.2;
      const dryRun = await repairApr28Snapshots({
        db,
        fetchHistoricalPrice: priceProvider
      });

      expect(dryRun.apply).toBe(false);
      expect(dryRun.snapshots_changed).toBe(1);
      expect(snapshots.getLatestSnapshot(agent.id)?.total_value).toBe(9080);

      const applied = await repairApr28Snapshots({
        db,
        apply: true,
        fetchHistoricalPrice: priceProvider
      });

      expect(applied.snapshots_changed).toBe(1);
      expect(snapshots.getLatestSnapshot(agent.id)?.positions_value).toBeCloseTo(20, 10);
      expect(snapshots.getLatestSnapshot(agent.id)?.total_value).toBeCloseTo(9020, 10);
      expect(
        db.prepare('SELECT COUNT(*) AS count FROM performance_chart_cache').get()
      ).toEqual({ count: 0 });

      const secondApply = await repairApr28Snapshots({
        db,
        apply: true,
        fetchHistoricalPrice: priceProvider
      });
      expect(secondApply.snapshots_changed).toBe(0);
    });
  });

  it('uses Gamma token metadata fallback when production rows do not yet store CLOB token ids', async () => {
    await withDbQueryModules(async ({ agents, cohorts, db, markets, positions, snapshots, trades }) => {
      const target = Math.floor(new Date('2026-04-28T12:00:01Z').getTime() / 1000);
      vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('gamma-api.polymarket.com')) {
          return new Response(JSON.stringify({
            id: 'pm-repair-metadata',
            question: 'Repair metadata?',
            active: true,
            archived: false,
            closed: false,
            outcomes: '["Yes","No"]',
            clobTokenIds: '["yes-token","no-token"]'
          }), { status: 200 });
        }

        return new Response(JSON.stringify({
          history: [{ t: target, p: '0.2' }]
        }), { status: 200 });
      }));

      const cohort = cohorts.createCohort();
      agents.createAgentsForCohort(cohort.id);
      const agent = agents.getAgentsByCohort(cohort.id)[0]!;
      db.prepare('UPDATE agents SET cash_balance = ? WHERE id = ?').run(9000, agent.id);
      const market = createMarket(markets, {
        polymarket_id: 'pm-repair-metadata',
        current_price: 0.8,
        clob_token_ids: null
      });
      const position = positions.upsertPosition(agent.id, market.id, 'YES', 100, 0.5, 50);
      const trade = trades.createTrade({
        agent_id: agent.id,
        market_id: market.id,
        position_id: position.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 100,
        price: 0.5,
        total_amount: 50
      });
      db.prepare('UPDATE trades SET executed_at = ? WHERE id = ?')
        .run('2026-04-28 11:00:00', trade.id);
      db.prepare('UPDATE positions SET opened_at = ? WHERE id = ?')
        .run('2026-04-28 11:00:00', position.id);
      snapshots.createPortfolioSnapshot({
        agent_id: agent.id,
        snapshot_timestamp: '2026-04-28 12:00:01',
        cash_balance: 9000,
        positions_value: 80,
        total_value: 9080,
        total_pnl: -920,
        total_pnl_percent: -9.2
      });

      const { repairApr28Snapshots } = await import('@/lib/maintenance/repairApr28Snapshots');
      const applied = await repairApr28Snapshots({ db, apply: true });

      expect(applied.snapshots_changed).toBe(1);
      expect(snapshots.getLatestSnapshot(agent.id)?.total_value).toBeCloseTo(9020, 10);
    });
  });
});
