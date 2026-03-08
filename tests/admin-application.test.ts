import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSingleAgentFixture } from '@/tests/helpers/db-fixtures';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

afterEach(() => {
  vi.doUnmock('@/lib/db');
  vi.doUnmock('@/lib/engine/cohort');
  vi.doUnmock('@/lib/engine/market');
  vi.useRealTimers();
  vi.resetModules();
});

describe('admin application data services', () => {
  it('returns current admin stats and costs without dropping inactive models', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const { queries, cohort, agent, modelId } = await createSingleAgentFixture();
      queries.upsertMarket({
        polymarket_id: 'admin-costs-market',
        question: 'Will admin costs include seeded totals?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.61,
        volume: 1000
      });

      queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET',
        tokens_input: 120,
        tokens_output: 45,
        api_cost_usd: 0.42
      });

      const admin = await import('@/lib/application/admin');
      const {
        getActiveModelFamilies,
        getModelFamilyByLegacyModelId
      } = await import('@/lib/db/queries');
      const stats = admin.getAdminStats();
      const costs = admin.getAdminCosts();
      const families = getActiveModelFamilies();
      const family = getModelFamilyByLegacyModelId(modelId);

      expect(stats).toMatchObject({
        active_cohorts: 1,
        total_agents: 1,
        markets_tracked: 1,
        total_api_cost: 0.42
      });
      expect(stats.updated_at).toEqual(expect.any(String));

      expect(costs.costs_by_model).toHaveLength(families.length);
      expect(costs.summary).toMatchObject({
        total_cost: 0.42,
        total_input_tokens: 120,
        total_output_tokens: 45,
        total_decisions: 1,
        avg_cost_per_decision: 0.42
      });
      expect(costs.updated_at).toEqual(expect.any(String));

      expect(costs.costs_by_model.find((cost) => cost.public_model_id === family?.slug)).toMatchObject({
        family_id: family?.id,
        legacy_model_id: modelId,
        total_cost: 0.42,
        total_input_tokens: 120,
        total_output_tokens: 45,
        decision_count: 1
      });
      expect(
        costs.costs_by_model
          .filter((cost) => cost.public_model_id !== family?.slug)
          .every((cost) => cost.total_cost === 0 && cost.decision_count === 0)
      ).toBe(true);
    } finally {
      await ctx.cleanup();
    }
  });

  it('filters and limits admin logs', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      db.prepare(`
        INSERT INTO system_logs (id, event_type, event_data, severity, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('log-1', 'admin_info', '{"step":1}', 'info', '2026-03-01T00:00:00.000Z');
      db.prepare(`
        INSERT INTO system_logs (id, event_type, event_data, severity, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('log-2', 'admin_warning', '{"step":2}', 'warning', '2026-03-02T00:00:00.000Z');
      db.prepare(`
        INSERT INTO system_logs (id, event_type, event_data, severity, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('log-3', 'admin_error', '{"step":3}', 'error', '2026-03-03T00:00:00.000Z');

      const admin = await import('@/lib/application/admin');
      const warningOnly = admin.getAdminLogs('warning', 10);
      const latestTwo = admin.getAdminLogs('all', 2);

      expect(warningOnly.logs).toHaveLength(1);
      expect(warningOnly.logs[0]).toMatchObject({
        event_type: 'admin_warning',
        severity: 'warning'
      });
      expect(latestTwo.logs).toHaveLength(2);
      expect((latestTwo.logs as Array<{ event_type: string }>).map((log) => log.event_type)).toEqual([
        'admin_error',
        'admin_warning'
      ]);
    } finally {
      await ctx.cleanup();
    }
  });
});

describe('admin action service', () => {
  it('returns the backup payload and audit log without changing the response shape', async () => {
    const createBackup = vi.fn(() => '/tmp/admin-backup.db');
    const getDb = vi.fn();
    const logSystemEvent = vi.fn();

    vi.doMock('@/lib/db', () => ({
      createBackup,
      getDb,
      logSystemEvent
    }));
    vi.doMock('@/lib/engine/cohort', () => ({
      maybeStartNewCohort: vi.fn(),
      checkAndCompleteCohorts: vi.fn()
    }));
    vi.doMock('@/lib/engine/market', () => ({
      syncMarkets: vi.fn()
    }));

    const { runAdminAction } = await import('@/lib/application/admin');
    const result = await runAdminAction('backup', false);

    expect(result).toEqual({
      ok: true,
      data: {
        success: true,
        backup_path: '/tmp/admin-backup.db'
      }
    });
    expect(createBackup).toHaveBeenCalledOnce();
    expect(logSystemEvent).toHaveBeenCalledWith(
      'admin_backup',
      { backup_path: '/tmp/admin-backup.db' },
      'info'
    );
  });

  it('keeps the unknown-action contract intact', async () => {
    const getDb = vi.fn();
    const logSystemEvent = vi.fn();

    vi.doMock('@/lib/db', () => ({
      createBackup: vi.fn(),
      getDb,
      logSystemEvent
    }));
    vi.doMock('@/lib/engine/cohort', () => ({
      maybeStartNewCohort: vi.fn(),
      checkAndCompleteCohorts: vi.fn()
    }));
    vi.doMock('@/lib/engine/market', () => ({
      syncMarkets: vi.fn()
    }));

    const { runAdminAction } = await import('@/lib/application/admin');
    const result = await runAdminAction('not-a-real-action', false);

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: 'Unknown action'
    });
    expect(logSystemEvent).not.toHaveBeenCalled();
  });
});
