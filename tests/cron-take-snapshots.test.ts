import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMarket, withDbQueryModules } from '@/tests/helpers/db-query-test-utils';

const refreshPersistedPerformanceCache = vi.fn();

vi.mock('@/lib/application/performance', () => ({
  refreshPersistedPerformanceCache
}));

describe('takeSnapshots decision window behavior', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('snapshots active current cohorts outside the decision window but skips archived cohorts', async () => {
    await withDbQueryModules(async ({ agents, cohorts, db, snapshots }) => {
      const created = Array.from({ length: 3 }, (_, index) => {
        const cohort = cohorts.createCohort();
        db.prepare('UPDATE cohorts SET started_at = ? WHERE id = ?').run(
          `2026-02-${String(1 + index * 7).padStart(2, '0')}T00:00:00.000Z`,
          cohort.id
        );
        agents.createAgentsForCohort(cohort.id);
        return cohorts.getCohortById(cohort.id)!;
      });
      db.prepare('UPDATE cohorts SET is_archived = 1, archive_reason = ? WHERE id = ?')
        .run('test archive', created[0]!.id);

      expect(cohorts.getDecisionEligibleCohorts(2).map((cohort) => cohort.id))
        .not.toContain(created[0]!.id);

      const { takeSnapshots } = await import('@/lib/application/cron/takeSnapshots');
      const result = await takeSnapshots();

      const expectedSnapshots = created.reduce(
        (sum, cohort) => sum + (cohort.id === created[0]!.id ? 0 : agents.getAgentsByCohort(cohort.id).length),
        0
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.snapshots_taken).toBe(expectedSnapshots);
      }

      for (const cohort of created) {
        for (const agent of agents.getAgentsByCohort(cohort.id)) {
          if (cohort.id === created[0]!.id) {
            expect(snapshots.getLatestSnapshot(agent.id)).toBeUndefined();
          } else {
            expect(snapshots.getLatestSnapshot(agent.id)).toBeTruthy();
          }
        }
      }
      expect(refreshPersistedPerformanceCache).toHaveBeenCalledOnce();
    });
  });

  it('values positions from CLOB prices and records market price provenance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ 'yes-token': '0.25' }), { status: 200 })
    ));

    await withDbQueryModules(async ({ agents, cohorts, db, markets, positions, snapshots }) => {
      const cohort = cohorts.createCohort();
      agents.createAgentsForCohort(cohort.id);
      const agent = agents.getAgentsByCohort(cohort.id)[0]!;
      const market = createMarket(markets, {
        current_price: 0.9,
        clob_token_ids: '["yes-token","no-token"]'
      });
      positions.upsertPosition(agent.id, market.id, 'YES', 100, 0.5, 50);

      const { takeSnapshots } = await import('@/lib/application/cron/takeSnapshots');
      const result = await takeSnapshots();

      expect(result.ok).toBe(true);
      const snapshot = snapshots.getLatestSnapshot(agent.id)!;
      expect(snapshot.positions_value).toBeCloseTo(25, 10);

      const provenance = db.prepare(`
        SELECT accepted_price, gamma_price, validation_status, anomaly_reason
        FROM market_price_snapshots
        WHERE market_id = ?
      `).get(market.id) as {
        accepted_price: number;
        gamma_price: number;
        validation_status: string;
        anomaly_reason: string;
      };

      expect(provenance.accepted_price).toBe(0.25);
      expect(provenance.gamma_price).toBe(0.9);
      expect(provenance.validation_status).toBe('accepted_with_gamma_disagreement');
      expect(provenance.anomaly_reason).toContain('Gamma price 0.9000 differs');
    });
  });
});
