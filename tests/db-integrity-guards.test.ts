import { describe, expect, it } from 'vitest';
import { createSingleAgentFixture } from '@/tests/helpers/db-fixtures';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

describe('database integrity guards', () => {
  it('rejects benchmark config slots whose release belongs to another family', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const dbModule = await import('@/lib/db');
      const benchmarkConfigs = await import('@/lib/db/queries/benchmark-configs');
      const db = dbModule.getDb();
      const [familyOne, familyTwo] = db.prepare(`
        SELECT id
        FROM model_families
        ORDER BY id ASC
        LIMIT 2
      `).all() as Array<{ id: string }>;
      const releaseTwo = db.prepare(`
        SELECT id
        FROM model_releases
        WHERE family_id = ?
        LIMIT 1
      `).get(familyTwo!.id) as { id: string };
      const config = benchmarkConfigs.createBenchmarkConfig({
        version_name: `mismatched-family-${Date.now()}`,
        methodology_version: 'v2',
        created_by: 'vitest'
      });

      expect(() => benchmarkConfigs.createBenchmarkConfigModel({
        benchmark_config_id: config.id,
        family_id: familyOne!.id,
        release_id: 'missing-release',
        slot_order: 0,
        family_display_name_snapshot: 'Missing Family',
        short_display_name_snapshot: 'MF',
        release_display_name_snapshot: 'Missing Release',
        provider_snapshot: 'Provider',
        color_snapshot: '#fff',
        openrouter_id_snapshot: 'provider/missing',
        input_price_per_million_snapshot: 0,
        output_price_per_million_snapshot: 0
      })).toThrow(/Unknown model release/);

      expect(() => benchmarkConfigs.createBenchmarkConfigModel({
        benchmark_config_id: config.id,
        family_id: familyOne!.id,
        release_id: releaseTwo.id,
        slot_order: 0,
        family_display_name_snapshot: 'Wrong Family',
        short_display_name_snapshot: 'WF',
        release_display_name_snapshot: 'Wrong Release',
        provider_snapshot: 'Provider',
        color_snapshot: '#fff',
        openrouter_id_snapshot: 'provider/wrong',
        input_price_per_million_snapshot: 0,
        output_price_per_million_snapshot: 0
      })).toThrow(/does not belong/);

      expect(() => db.prepare(`
        INSERT INTO benchmark_config_models (
          id, benchmark_config_id, family_id, release_id, slot_order,
          family_display_name_snapshot, short_display_name_snapshot,
          release_display_name_snapshot, provider_snapshot, color_snapshot,
          openrouter_id_snapshot, input_price_per_million_snapshot,
          output_price_per_million_snapshot
        ) VALUES (?, ?, ?, ?, 0, 'Wrong Family', 'WF', 'Wrong Release', 'Provider', '#fff', 'provider/wrong', 0, 0)
      `).run('bad-config-model', config.id, familyOne!.id, releaseTwo.id)).toThrow(/benchmark config release\/family mismatch/);

      expect(() => benchmarkConfigs.setDefaultBenchmarkConfig('missing-config')).toThrow(/Unknown benchmark config/);
    } finally {
      await ctx.cleanup();
    }
  });

  it('rejects decision and trade rows whose related identities disagree', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const fixture = await createSingleAgentFixture();
      const db = fixture.db;
      const secondCohortId = 'integrity-second-cohort';
      db.prepare(`
        INSERT INTO cohorts (
          id, cohort_number, started_at, methodology_version, benchmark_config_id
        ) VALUES (?, ?, '2026-01-01T00:00:00.000Z', 'v2', ?)
      `).run(secondCohortId, fixture.cohort.cohort_number + 1, fixture.cohort.benchmark_config_id);
      const [secondAgent] = fixture.queries.createAgentsForCohort(secondCohortId, fixture.cohort.benchmark_config_id);
      const market = fixture.queries.upsertMarket({
        polymarket_id: 'pm-integrity-guards',
        question: 'Will integrity guards hold?',
        close_date: '2099-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.5,
        volume: 1000
      });
      const position = fixture.queries.upsertPosition(fixture.agent.id, market.id, 'YES', 10, 0.5, 5);
      const decision = fixture.queries.createDecision({
        agent_id: fixture.agent.id,
        cohort_id: fixture.cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET'
      });

      expect(() => fixture.queries.claimDecisionForProcessing({
        agent_id: fixture.agent.id,
        cohort_id: secondCohortId,
        decision_week: 1,
        stale_after_ms: 60_000
      })).toThrow(/agent\/cohort mismatch/i);

      expect(() => fixture.queries.createDecision({
        agent_id: fixture.agent.id,
        cohort_id: secondCohortId,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'HOLD'
      })).toThrow(/agent\/cohort mismatch/i);

      expect(() => db.prepare(`
        INSERT INTO decisions (
          id, agent_id, cohort_id, decision_week, decision_timestamp,
          prompt_system, prompt_user, action
        ) VALUES ('bad-decision', ?, ?, 1, CURRENT_TIMESTAMP, 'system', 'user', 'HOLD')
      `).run(fixture.agent.id, secondCohortId)).toThrow(/decision agent\/cohort mismatch/);

      expect(() => fixture.queries.createTrade({
        agent_id: secondAgent!.id,
        market_id: market.id,
        position_id: position.id,
        decision_id: decision.id,
        trade_type: 'SELL',
        side: 'YES',
        shares: 1,
        price: 0.5,
        total_amount: 0.5
      })).toThrow(/position does not match agent, market, and side/i);

      expect(() => fixture.queries.createTrade({
        agent_id: secondAgent!.id,
        market_id: market.id,
        decision_id: decision.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 1,
        price: 0.5,
        total_amount: 0.5
      })).toThrow(/decision does not match agent/i);

      const [familyOne, familyTwo] = db.prepare(`
        SELECT id
        FROM model_families
        ORDER BY id ASC
        LIMIT 2
      `).all() as Array<{ id: string }>;
      const releaseTwo = db.prepare(`
        SELECT id
        FROM model_releases
        WHERE family_id = ?
        LIMIT 1
      `).get(familyTwo!.id) as { id: string };
      expect(() => fixture.queries.createTrade({
        agent_id: fixture.agent.id,
        market_id: market.id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 1,
        price: 0.5,
        total_amount: 0.5,
        family_id: familyOne!.id,
        release_id: releaseTwo.id
      })).toThrow(/release does not match family/i);

      expect(() => db.prepare(`
        INSERT INTO trades (
          id, agent_id, market_id, position_id, decision_id, trade_type,
          side, shares, price, total_amount
        ) VALUES ('bad-trade', ?, ?, ?, ?, 'SELL', 'YES', 1, 0.5, 0.5)
      `).run(secondAgent!.id, market.id, position.id, decision.id)).toThrow(/trade relationship mismatch/);
    } finally {
      await ctx.cleanup();
    }
  });
});
