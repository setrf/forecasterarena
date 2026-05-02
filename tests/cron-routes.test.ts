import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

function authorizedRequest(url: string): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer cron-secret'
    }
  });
}

afterEach(() => {
  vi.doUnmock('@/lib/application/cron');
  vi.resetModules();
});

describe('cron routes', () => {
  it('requires the Bearer authorization scheme exactly', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'test',
      env: { CRON_SECRET: 'cron-secret' }
    });

    try {
      const runMarketSync = vi.fn(async () => ({
        ok: true as const,
        data: { markets_added: 1, markets_updated: 2 }
      }));

      vi.doMock('@/lib/application/cron', () => ({ runMarketSync }));

      const route = await import('@/app/api/cron/sync-markets/route');
      const rawSecretResponse = await route.POST(new Request('http://localhost/api/cron/sync-markets', {
        method: 'POST',
        headers: { Authorization: 'cron-secret' }
      }) as any);
      const bearerResponse = await route.POST(authorizedRequest('http://localhost/api/cron/sync-markets') as any);

      expect(rawSecretResponse.status).toBe(401);
      expect(await rawSecretResponse.json()).toEqual({ error: 'Unauthorized' });
      expect(bearerResponse.status).toBe(200);
      expect(runMarketSync).toHaveBeenCalledOnce();
    } finally {
      await ctx.cleanup();
    }
  });

  it('delegates market sync to the cron application layer', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'test',
      env: { CRON_SECRET: 'cron-secret' }
    });

    try {
      const runMarketSync = vi.fn(async () => ({
        ok: true as const,
        data: { markets_added: 1, markets_updated: 2 }
      }));

      vi.doMock('@/lib/application/cron', () => ({ runMarketSync }));

      const route = await import('@/app/api/cron/sync-markets/route');
      const response = await route.POST(authorizedRequest('http://localhost/api/cron/sync-markets') as any);

      expect(runMarketSync).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ markets_added: 1, markets_updated: 2 });
    } finally {
      await ctx.cleanup();
    }
  });

  it('passes the force query flag through the start cohort route', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'test',
      env: { CRON_SECRET: 'cron-secret' }
    });

    try {
      const startCohort = vi.fn(() => ({
        ok: true as const,
        data: {
          success: true,
          cohort_id: 'cohort-1',
          cohort_number: 12,
          agents_created: 7
        }
      }));

      vi.doMock('@/lib/application/cron', () => ({ startCohort }));

      const route = await import('@/app/api/cron/start-cohort/route');
      const response = await route.POST(
        authorizedRequest('http://localhost/api/cron/start-cohort?force=true') as any
      );

      expect(startCohort).toHaveBeenCalledWith(true);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        success: true,
        cohort_id: 'cohort-1',
        cohort_number: 12,
        agents_created: 7
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('returns decision job output from the application layer', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'test',
      env: { CRON_SECRET: 'cron-secret' }
    });

    try {
      const runDecisions = vi.fn(async () => ({
        ok: true as const,
        data: {
          success: true,
          cohort_bootstrap: { cohort_id: 'cohort-2', cohort_number: 2 },
          decision_cohort_limit: 5,
          tracking_active_cohorts: 8,
          decision_eligible_cohorts: 5,
          cohorts_processed: 1,
          total_agents: 6,
          total_errors: 0,
          duration_ms: 1234,
          results: []
        }
      }));

      vi.doMock('@/lib/application/cron', () => ({ runDecisions }));

      const route = await import('@/app/api/cron/run-decisions/route');
      const response = await route.POST(authorizedRequest('http://localhost/api/cron/run-decisions') as any);

      expect(runDecisions).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        success: true,
        decision_cohort_limit: 5,
        tracking_active_cohorts: 8,
        decision_eligible_cohorts: 5,
        cohorts_processed: 1,
        total_agents: 6,
        total_errors: 0
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('returns resolution job output from the application layer', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'test',
      env: { CRON_SECRET: 'cron-secret' }
    });

    try {
      const checkResolutions = vi.fn(async () => ({
        ok: true as const,
        data: {
          success: true,
          markets_checked: 10,
          markets_resolved: 3,
          positions_settled: 9,
          cohorts_completed: 1,
          errors: 0,
          duration_ms: 222
        }
      }));

      vi.doMock('@/lib/application/cron', () => ({ checkResolutions }));

      const route = await import('@/app/api/cron/check-resolutions/route');
      const response = await route.POST(
        authorizedRequest('http://localhost/api/cron/check-resolutions') as any
      );

      expect(checkResolutions).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        success: true,
        markets_checked: 10,
        markets_resolved: 3,
        positions_settled: 9,
        cohorts_completed: 1,
        errors: 0,
        duration_ms: 222
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('returns snapshot job output from the application layer', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'test',
      env: { CRON_SECRET: 'cron-secret' }
    });

    try {
      const takeSnapshots = vi.fn(async () => ({
        ok: true as const,
        data: {
          success: true,
          snapshots_taken: 4,
          positions_updated: 9,
          errors: 1,
          duration_ms: 456
        }
      }));

      vi.doMock('@/lib/application/cron', () => ({ takeSnapshots }));

      const route = await import('@/app/api/cron/take-snapshots/route');
      const response = await route.POST(
        authorizedRequest('http://localhost/api/cron/take-snapshots') as any
      );

      expect(takeSnapshots).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        success: true,
        snapshots_taken: 4,
        positions_updated: 9,
        errors: 1,
        duration_ms: 456
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('returns backup job output from the application layer', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'test',
      env: { CRON_SECRET: 'cron-secret' }
    });

    try {
      const createDatabaseBackup = vi.fn(() => ({
        ok: true as const,
        data: {
          success: true,
          backup_path: '/tmp/backup.db',
          duration_ms: 78
        }
      }));

      vi.doMock('@/lib/application/cron', () => ({ createDatabaseBackup }));

      const route = await import('@/app/api/cron/backup/route');
      const response = await route.POST(authorizedRequest('http://localhost/api/cron/backup') as any);

      expect(createDatabaseBackup).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        success: true,
        backup_path: '/tmp/backup.db',
        duration_ms: 78
      });
    } finally {
      await ctx.cleanup();
    }
  });
});
