import { describe, expect, it } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

describe('schema seeds and idempotency behavior', () => {
  it('enforces frozen cohort and agent lineage at the schema and trigger level', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const dbModule = await import('@/lib/db');
      const queries = await import('@/lib/db/queries');
      const db = dbModule.getDb();

      const cohortColumns = db.prepare(`PRAGMA table_info(cohorts)`).all() as Array<{
        name: string;
        notnull: number;
      }>;
      const agentColumns = db.prepare(`PRAGMA table_info(agents)`).all() as Array<{
        name: string;
        notnull: number;
      }>;
      const agentTableSql = db.prepare(`
        SELECT sql
        FROM sqlite_master
        WHERE type = 'table' AND name = 'agents'
      `).get() as { sql: string };

      expect(cohortColumns.find((column) => column.name === 'benchmark_config_id')?.notnull).toBe(1);
      expect(agentColumns.find((column) => column.name === 'family_id')?.notnull).toBe(1);
      expect(agentColumns.find((column) => column.name === 'release_id')?.notnull).toBe(1);
      expect(agentColumns.find((column) => column.name === 'benchmark_config_model_id')?.notnull).toBe(1);
      expect(agentTableSql.sql).toContain('UNIQUE(cohort_id, benchmark_config_model_id)');
      expect(agentTableSql.sql).not.toContain('UNIQUE(cohort_id, model_id)');

      const cohort = queries.createCohort();
      const [agent] = queries.createAgentsForCohort(cohort.id);

      expect(() => {
        db.prepare(`
          UPDATE cohorts
          SET benchmark_config_id = NULL
          WHERE id = ?
        `).run(cohort.id);
      }).toThrow(/benchmark_config_id is required/i);

      expect(() => {
        db.prepare(`
          UPDATE agents
          SET family_id = NULL
          WHERE id = ?
        `).run(agent.id);
      }).toThrow(/frozen lineage is required/i);
    } finally {
      await ctx.cleanup();
    }
  });

  it('preserves existing model rows instead of mutating them during reseed', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const dbModule = await import('@/lib/db');
      const schema = await import('@/lib/db/schema');
      const db = dbModule.getDb();

      db.prepare(`
        UPDATE models
        SET openrouter_id = ?, display_name = ?
        WHERE id = 'gpt-5.1'
      `).run('openai/gpt-legacy', 'GPT Legacy');

      db.exec(schema.SEED_MODELS_SQL);

      const row = db.prepare(`
        SELECT openrouter_id, display_name
        FROM models
        WHERE id = 'gpt-5.1'
      `).get() as { openrouter_id: string; display_name: string };

      expect(row.openrouter_id).toBe('openai/gpt-legacy');
      expect(row.display_name).toBe('GPT Legacy');
    } finally {
      await ctx.cleanup();
    }
  });

  it('upserts methodology seed data onto existing rows', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const dbModule = await import('@/lib/db');
      const schema = await import('@/lib/db/schema');
      const db = dbModule.getDb();

      db.prepare(`
        UPDATE methodology_versions
        SET title = ?, description = ?, effective_from_cohort = ?
        WHERE version = 'v1'
      `).run('Old Title', 'Old Description', 999);

      db.exec(schema.SEED_METHODOLOGY_SQL);

      const row = db.prepare(`
        SELECT title, description, effective_from_cohort
        FROM methodology_versions
        WHERE version = 'v1'
      `).get() as {
        title: string;
        description: string;
        effective_from_cohort: number;
      };

      expect(row.title).toBe('Forecaster Arena Methodology v1');
      expect(row.description).toMatch(/Initial methodology for LLM forecasting benchmark/i);
      expect(row.effective_from_cohort).toBe(1);

      const v2Row = db.prepare(`
        SELECT title, description, effective_from_cohort
        FROM methodology_versions
        WHERE version = 'v2'
      `).get() as {
        title: string;
        description: string;
        effective_from_cohort: number | null;
      };

      expect(v2Row.title).toBe('Forecaster Arena Methodology v2');
      expect(v2Row.description).toMatch(/Reality-grounded LLM evaluation/i);
      expect(v2Row.effective_from_cohort).toBeNull();
    } finally {
      await ctx.cleanup();
    }
  });

  it('archives existing v1 cohorts while leaving v2 and new cohorts current', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const dbModule = await import('@/lib/db');
      const queries = await import('@/lib/db/queries');
      const { archiveV1CohortsMigration } = await import('@/lib/db/migrations/011_archive_v1_cohorts');
      const db = dbModule.getDb();
      const config = db.prepare(`
        SELECT id
        FROM benchmark_configs
        WHERE is_default_for_future_cohorts = 1
        LIMIT 1
      `).get() as { id: string };

      db.prepare(`
        INSERT INTO cohorts (
          id, cohort_number, started_at, methodology_version, benchmark_config_id
        ) VALUES (?, ?, ?, ?, ?)
      `).run('legacy-v1-cohort', 1, '2026-01-04T00:00:00.000Z', 'v1', config.id);
      db.prepare(`
        INSERT INTO cohorts (
          id, cohort_number, started_at, methodology_version, benchmark_config_id
        ) VALUES (?, ?, ?, ?, ?)
      `).run('current-v2-cohort', 2, '2026-01-11T00:00:00.000Z', 'v2', config.id);
      db.prepare(`
        INSERT INTO performance_chart_cache (
          cache_key, cohort_id, range_key, payload_json
        ) VALUES (?, NULL, ?, ?)
      `).run('1M::all', '1M', JSON.stringify([{ date: 'stale' }]));

      archiveV1CohortsMigration.apply(db);

      const legacy = queries.getCohortById('legacy-v1-cohort')!;
      const current = queries.getCohortById('current-v2-cohort')!;
      expect(legacy.is_archived).toBe(1);
      expect(legacy.archived_at).toBeTruthy();
      expect(legacy.archive_reason).toMatch(/historical v1/i);
      expect(current.is_archived).toBe(0);
      expect(current.archived_at).toBeNull();
      expect(current.archive_reason).toBeNull();
      expect(db.prepare('SELECT COUNT(*) as count FROM performance_chart_cache').get()).toEqual({ count: 0 });

      const newCohort = queries.createCohort(config.id);
      expect(queries.getCohortById(newCohort.id)?.is_archived).toBe(0);
    } finally {
      await ctx.cleanup();
    }
  });

  it('deduplicates brier score creation by trade_id', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const queries = await import('@/lib/db/queries');
      const dbModule = await import('@/lib/db');
      const db = dbModule.getDb();

      const cohort = queries.createCohort();
      const [agent] = queries.createAgentsForCohort(cohort.id);

      const market = queries.upsertMarket({
        polymarket_id: `pm-brier-${Date.now()}`,
        question: 'Will brier dedupe hold?',
        market_type: 'binary',
        current_price: 0.5,
        close_date: '2099-01-01T00:00:00.000Z',
        status: 'active'
      });

      const position = queries.upsertPosition(agent.id, market.id, 'YES', 10, 0.5, 5);
      const trade = queries.createTrade({
        agent_id: agent.id,
        market_id: market.id,
        position_id: position.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.5,
        total_amount: 5,
        implied_confidence: 0.5
      });

      const first = queries.createBrierScore({
        agent_id: agent.id,
        trade_id: trade.id,
        market_id: market.id,
        forecast_probability: 0.5,
        actual_outcome: 1,
        brier_score: 0.25
      });

      const second = queries.createBrierScore({
        agent_id: agent.id,
        trade_id: trade.id,
        market_id: market.id,
        forecast_probability: 0.5,
        actual_outcome: 1,
        brier_score: 0.25
      });

      expect(second.id).toBe(first.id);
      const count = db.prepare(`
        SELECT COUNT(*) as count
        FROM brier_scores
        WHERE trade_id = ?
      `).get(trade.id) as { count: number };
      const indexInfo = db.prepare(`
        PRAGMA index_list('brier_scores')
      `).all() as Array<{ name: string; unique: number }>;

      expect(count.count).toBe(1);
      expect(indexInfo.find((index) => index.name === 'idx_brier_trade')?.unique).toBe(1);
    } finally {
      await ctx.cleanup();
    }
  });
});
