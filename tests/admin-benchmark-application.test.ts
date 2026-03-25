import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

afterEach(() => {
  vi.doUnmock('@/lib/db');
  vi.resetModules();
});

async function buildFullAssignments() {
  const queries = await import('@/lib/db/queries');
  return queries.getActiveModelFamilies().map((family) => {
    const release = queries.getCurrentReleaseForFamily(family.id) ?? queries.getModelReleasesByFamily(family.id)[0]!;
    return {
      family_id: family.id,
      release_id: release.id,
      input_price_per_million: 1,
      output_price_per_million: 2
    };
  });
}

describe('admin benchmark lineage services', () => {
  it('returns an overview with family releases and config snapshots', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const { getAdminBenchmarkOverview } = await import('@/lib/application/admin-benchmark');
      const overview = getAdminBenchmarkOverview();

      expect(overview.default_config_id).toBeTruthy();
      expect(overview.updated_at).toEqual(expect.any(String));
      expect(overview.families.length).toBeGreaterThan(0);
      expect(overview.configs.length).toBeGreaterThan(0);
      expect(overview.families[0]).toMatchObject({
        current_release_id: expect.any(String),
        releases: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            release_name: expect.any(String)
          })
        ])
      });
      expect(overview.configs[0]?.models.length).toBeGreaterThan(0);
    } finally {
      await ctx.cleanup();
    }
  });

  it('creates a new family release and rejects duplicates', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const { getActiveModelFamilies } = await import('@/lib/db/queries');
      const { createAdminModelReleaseRecord } = await import('@/lib/application/admin-benchmark');
      const family = getActiveModelFamilies()[0]!;

      const created = createAdminModelReleaseRecord({
        family_id: family.id,
        release_name: 'Future Test Release',
        openrouter_id: `${family.provider.toLowerCase()}/future-test-release`,
        default_input_price_per_million: 3,
        default_output_price_per_million: 9,
        notes: 'Created during tests'
      });

      expect(created).toMatchObject({
        ok: true,
        data: {
          success: true,
          release: {
            family_id: family.id,
            release_name: 'Future Test Release',
            default_input_price_per_million: 3,
            default_output_price_per_million: 9
          }
        }
      });

      const duplicate = createAdminModelReleaseRecord({
        family_id: family.id,
        release_name: 'Future Test Release',
        openrouter_id: `${family.provider.toLowerCase()}/future-test-release`,
        default_input_price_per_million: 3,
        default_output_price_per_million: 9
      });

      expect(duplicate).toEqual({
        ok: false,
        status: 409,
        error: 'A release with that slug already exists for this family'
      });

      const malformed = createAdminModelReleaseRecord({
        family_id: family.id,
        release_name: null as never,
        openrouter_id: `${family.provider.toLowerCase()}/bad-release`,
        default_input_price_per_million: 3,
        default_output_price_per_million: 9
      });

      expect(malformed).toEqual({
        ok: false,
        status: 400,
        error: 'Release name is required'
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('validates config creation and can promote a complete config', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const { getActiveModelFamilies } = await import('@/lib/db/queries');
      const {
        createAdminBenchmarkConfigRecord,
        promoteAdminBenchmarkConfig
      } = await import('@/lib/application/admin-benchmark');
      const families = getActiveModelFamilies();
      const assignments = await buildFullAssignments();

      const missingFamilyResult = createAdminBenchmarkConfigRecord({
        version_name: 'incomplete-config',
        methodology_version: 'v1',
        assignments: assignments.slice(0, Math.max(1, families.length - 1))
      });

      expect(missingFamilyResult).toMatchObject({
        ok: false,
        status: 400
      });

      const created = createAdminBenchmarkConfigRecord({
        version_name: 'complete-config',
        methodology_version: 'v1',
        notes: 'Full test lineup',
        assignments
      });

      expect(created.ok).toBe(true);
      if (!created.ok) {
        return;
      }

      expect(created.data.config.models).toHaveLength(families.length);

      const promoted = promoteAdminBenchmarkConfig(created.data.config.id);
      expect(promoted).toEqual({
        ok: true,
        data: {
          success: true,
          config_id: created.data.config.id,
          version_name: 'complete-config'
        }
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('keeps existing cohorts on their frozen release after a new lineup is promoted', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-01T00:05:00.000Z'));

      const queries = await import('@/lib/db/queries');
      const {
        createAdminBenchmarkConfigRecord,
        createAdminModelReleaseRecord,
        promoteAdminBenchmarkConfig
      } = await import('@/lib/application/admin-benchmark');
      const { startNewCohort } = await import('@/lib/engine/cohort');

      const firstStart = startNewCohort();
      expect(firstStart.success).toBe(true);
      if (!firstStart.success) {
        return;
      }
      const firstCohort = firstStart.cohort!;

      const firstCohortAgents = queries.getAgentsWithModelsByCohort(firstCohort.id);
      const openAiFamily = queries.getModelFamilyById('openai-gpt')!;
      const firstOpenAiAgent = firstCohortAgents.find((agent) => agent.family_id === openAiFamily.id)!;
      const oldReleaseId = firstOpenAiAgent.release_id;

      const releaseResult = createAdminModelReleaseRecord({
        family_id: openAiFamily.id,
        release_name: 'GPT-5.4',
        openrouter_id: 'openai/gpt-5.4',
        default_input_price_per_million: 6,
        default_output_price_per_million: 18
      });
      expect(releaseResult.ok).toBe(true);
      if (!releaseResult.ok) {
        return;
      }

      const assignments = (await buildFullAssignments()).map((assignment) => (
        assignment.family_id === openAiFamily.id
          ? {
            ...assignment,
            release_id: releaseResult.data.release.id,
            input_price_per_million: 6,
            output_price_per_million: 18
          }
          : assignment
      ));

      const configResult = createAdminBenchmarkConfigRecord({
        version_name: 'lineup-with-gpt54',
        methodology_version: 'v1',
        assignments
      });
      expect(configResult.ok).toBe(true);
      if (!configResult.ok) {
        return;
      }

      const promoteResult = promoteAdminBenchmarkConfig(configResult.data.config.id);
      expect(promoteResult.ok).toBe(true);

      vi.setSystemTime(new Date('2026-03-08T00:05:00.000Z'));
      const secondStart = startNewCohort();
      expect(secondStart.success).toBe(true);
      if (!secondStart.success) {
        return;
      }
      const secondCohort = secondStart.cohort!;

      const secondCohortAgents = queries.getAgentsWithModelsByCohort(secondCohort.id);
      const secondOpenAiAgent = secondCohortAgents.find((agent) => agent.family_id === openAiFamily.id)!;

      expect(firstOpenAiAgent.release_id).toBe(oldReleaseId);
      expect(firstOpenAiAgent.model.release_name).not.toBe('GPT-5.4');
      expect(secondOpenAiAgent.release_id).toBe(releaseResult.data.release.id);
      expect(secondOpenAiAgent.model.release_name).toBe('GPT-5.4');
      expect(secondOpenAiAgent.model.input_price_per_million).toBe(6);
      expect(secondOpenAiAgent.model.output_price_per_million).toBe(18);

      const reloadedFirstOpenAiAgent = queries.getAgentsWithModelsByCohort(firstCohort.id)
        .find((agent) => agent.family_id === openAiFamily.id)!;
      expect(reloadedFirstOpenAiAgent.release_id).toBe(oldReleaseId);
      expect(reloadedFirstOpenAiAgent.model.release_name).not.toBe('GPT-5.4');
    } finally {
      vi.useRealTimers();
      await ctx.cleanup();
    }
  });

  it('rejects malformed config payloads and rolls back partial config writes', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const queries = await import('@/lib/db/queries');
      const actualAdmin = await import('@/lib/application/admin-benchmark');
      const actualDbQueries = await import('@/lib/db/queries');
      const assignments = await buildFullAssignments();
      const malformed = actualAdmin.createAdminBenchmarkConfigRecord({
        version_name: null as never,
        methodology_version: 'v1',
        assignments
      });

      expect(malformed).toEqual({
        ok: false,
        status: 400,
        error: 'Version name is required'
      });

      const baselineCount = queries.getAllBenchmarkConfigs().length;

      vi.resetModules();
      vi.doMock('@/lib/db/queries', async () => {
        const actual = await vi.importActual<typeof import('@/lib/db/queries')>('@/lib/db/queries');
        let createCalls = 0;

        return {
          ...actual,
          createBenchmarkConfigModel(args: Parameters<typeof actual.createBenchmarkConfigModel>[0]) {
            createCalls += 1;
            if (createCalls === 2) {
              throw new Error('synthetic config model failure');
            }

            return actual.createBenchmarkConfigModel(args);
          }
        };
      });

      const failingAdmin = await import('@/lib/application/admin-benchmark');

      expect(() => failingAdmin.createAdminBenchmarkConfigRecord({
        version_name: 'should-rollback',
        methodology_version: 'v1',
        assignments
      })).toThrow('synthetic config model failure');

      vi.doUnmock('@/lib/db/queries');
      vi.resetModules();
      const reloadedQueries = await import('@/lib/db/queries');
      expect(reloadedQueries.getAllBenchmarkConfigs()).toHaveLength(baselineCount);
    } finally {
      vi.doUnmock('@/lib/db/queries');
      vi.resetModules();
      await ctx.cleanup();
    }
  });
});
