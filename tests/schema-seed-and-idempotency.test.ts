import { describe, expect, it, vi } from 'vitest';
import { latestModelLineupMigration } from '@/lib/db/migrations/012_latest_model_lineup';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

describe('schema seeds and idempotency behavior', () => {
  it('includes CLOB token metadata and market price provenance tables', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const dbModule = await import('@/lib/db');
      const db = dbModule.getDb();
      const marketColumns = db.prepare(`PRAGMA table_info(markets)`).all() as Array<{ name: string }>;
      const provenanceTable = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'market_price_snapshots'
      `).get();
      const provenanceIndexes = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'index' AND tbl_name = 'market_price_snapshots'
      `).all() as Array<{ name: string }>;

      expect(marketColumns.some((column) => column.name === 'clob_token_ids')).toBe(true);
      expect(provenanceTable).toEqual({ name: 'market_price_snapshots' });
      expect(provenanceIndexes.map((index) => index.name)).toContain('idx_market_price_snapshots_market_time');
    } finally {
      await ctx.cleanup();
    }
  });

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

  it('promotes the latest exact lineup without rewriting existing active cohort lineage', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-19T00:05:00.000Z'));

      const queries = await import('@/lib/db/queries');
      const dbModule = await import('@/lib/db');
      const db = dbModule.getDb();
      const families = queries.getActiveModelFamilies();

      const oldConfig = queries.createBenchmarkConfig({
        version_name: 'pre-012-test-lineup',
        methodology_version: 'v2',
        created_by: 'vitest',
        is_default_for_future_cohorts: true
      });

      for (const family of families) {
        const oldRelease = queries.createModelRelease({
          id: `${family.id}--pre-012-test`,
          family_id: family.id,
          release_name: `${family.public_display_name} Pre-012 Test`,
          release_slug: 'pre-012-test',
          openrouter_id: `${family.slug}/pre-012-test`,
          provider: family.provider
        });

        queries.createBenchmarkConfigModel({
          benchmark_config_id: oldConfig.id,
          family_id: family.id,
          release_id: oldRelease.id,
          slot_order: family.sort_order,
          family_display_name_snapshot: family.public_display_name,
          short_display_name_snapshot: family.short_display_name,
          release_display_name_snapshot: oldRelease.release_name,
          provider_snapshot: oldRelease.provider,
          color_snapshot: family.color,
          openrouter_id_snapshot: oldRelease.openrouter_id,
          input_price_per_million_snapshot: 1,
          output_price_per_million_snapshot: 2
        });
      }

      const oldCohort = queries.createCohort(oldConfig.id);
      const oldAgents = queries.createAgentsForCohort(oldCohort.id, oldConfig.id);
      const oldAgentLineage = oldAgents.map((agent) => ({
        id: agent.id,
        release_id: agent.release_id,
        benchmark_config_model_id: agent.benchmark_config_model_id
      }));

      db.prepare(`
        INSERT INTO performance_chart_cache (cache_key, range_key, payload_json)
        VALUES ('test-cache', 'ALL', '{}')
      `).run();

      latestModelLineupMigration.apply(db);
      latestModelLineupMigration.apply(db);

      expect(queries.getDefaultBenchmarkConfig()?.id).toBe('lineup-2026-05-latest-exact');
      expect(db.prepare('SELECT COUNT(*) as count FROM performance_chart_cache').get()).toEqual({ count: 0 });

      const reloadedOldCohort = queries.getCohortById(oldCohort.id)!;
      expect(reloadedOldCohort.benchmark_config_id).toBe(oldConfig.id);

      const reloadedOldAgentLineage = queries.getAgentsByCohort(oldCohort.id).map((agent) => ({
        id: agent.id,
        release_id: agent.release_id,
        benchmark_config_model_id: agent.benchmark_config_model_id
      }));
      expect(reloadedOldAgentLineage).toEqual(oldAgentLineage);

      vi.setSystemTime(new Date('2026-04-26T00:05:00.000Z'));
      const newCohort = queries.createCohort();
      queries.createAgentsForCohort(newCohort.id, newCohort.benchmark_config_id);
      const newAgents = queries.getAgentsWithModelsByCohort(newCohort.id);

      expect(newCohort.benchmark_config_id).toBe('lineup-2026-05-latest-exact');
      expect(newAgents.map((agent) => agent.model.openrouter_id).sort()).toEqual([
        'anthropic/claude-opus-4.7',
        'deepseek/deepseek-v4-pro',
        'google/gemini-3.1-pro-preview',
        'moonshotai/kimi-k2.6',
        'openai/gpt-5.5',
        'qwen/qwen3.6-max-preview',
        'x-ai/grok-4.3'
      ]);
    } finally {
      vi.useRealTimers();
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
