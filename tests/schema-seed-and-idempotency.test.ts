import { describe, expect, it } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

describe('schema seeds and idempotency behavior', () => {
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
      expect(count.count).toBe(1);
    } finally {
      await ctx.cleanup();
    }
  });
});
