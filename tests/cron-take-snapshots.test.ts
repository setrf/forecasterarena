import { describe, expect, it, vi } from 'vitest';
import { withDbQueryModules } from '@/tests/helpers/db-query-test-utils';

const refreshPersistedPerformanceCache = vi.fn();

vi.mock('@/lib/application/performance', () => ({
  refreshPersistedPerformanceCache
}));

describe('takeSnapshots decision window behavior', () => {
  it('snapshots all active cohorts, including cohorts outside the decision window', async () => {
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

      expect(cohorts.getDecisionEligibleCohorts(2).map((cohort) => cohort.id))
        .not.toContain(created[0]!.id);

      const { takeSnapshots } = await import('@/lib/application/cron/takeSnapshots');
      const result = await takeSnapshots();

      const expectedSnapshots = created.reduce(
        (sum, cohort) => sum + agents.getAgentsByCohort(cohort.id).length,
        0
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.snapshots_taken).toBe(expectedSnapshots);
      }

      for (const cohort of created) {
        for (const agent of agents.getAgentsByCohort(cohort.id)) {
          expect(snapshots.getLatestSnapshot(agent.id)).toBeTruthy();
        }
      }
      expect(refreshPersistedPerformanceCache).toHaveBeenCalledOnce();
    });
  });
});
