import { describe, expect, it } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';
import { createSingleAgentFixture } from '@/tests/helpers/db-fixtures';

async function buildUpdatedConfigForFamily(familyId: string, releaseId: string) {
  const queries = await import('@/lib/db/queries');
  const families = queries.getActiveModelFamilies();
  return {
    families,
    assignments: families.map((family, index) => {
      const current = queries.getCurrentReleaseForFamily(family.id) ?? queries.getModelReleasesByFamily(family.id)[0]!;
      const release = family.id === familyId ? queries.getModelReleaseById(releaseId)! : current;
      return {
        family_id: family.id,
        release_id: release.id,
        input_price_per_million: index + 1,
        output_price_per_million: (index + 1) * 2
      };
    })
  };
}

describe('benchmark rollover and frozen lineage application', () => {
  it('previews and applies active-cohort rollovers through the admin benchmark service', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const fixture = await createSingleAgentFixture();
      const queries = await import('@/lib/db/queries');
      const admin = await import('@/lib/application/admin-benchmark');
      const family = queries.resolveModelFamily(fixture.legacyModelId)!;
      const agentBefore = queries.getAgentsWithModelsByCohort(fixture.cohort.id).find((item) => item.family_id === family.id)!;

      const releaseResult = admin.createAdminModelReleaseRecord({
        family_id: family.id,
        release_name: 'Future Rollover Release',
        openrouter_id: `${family.provider.toLowerCase()}/future-rollover-release`,
        default_input_price_per_million: 9,
        default_output_price_per_million: 18
      });

      expect(releaseResult.ok).toBe(true);
      if (!releaseResult.ok) {
        return;
      }

      const { assignments } = await buildUpdatedConfigForFamily(family.id, releaseResult.data.release.id);
      const configResult = admin.createAdminBenchmarkConfigRecord({
        version_name: 'rollover-preview-config',
        methodology_version: 'v1',
        assignments
      });

      expect(configResult.ok).toBe(true);
      if (!configResult.ok) {
        return;
      }

      const previewResult = admin.getAdminBenchmarkRolloverPreview(configResult.data.config.id);
      expect(previewResult.ok).toBe(true);
      if (!previewResult.ok) {
        return;
      }

      expect(previewResult.data.impacted_cohorts).toBe(1);
      expect(previewResult.data.impacted_agents).toBe(1);
      expect(previewResult.data.family_changes).toEqual([
        expect.objectContaining({
          family_id: family.id,
          from_release_name: agentBefore.model.release_name,
          to_release_name: 'Future Rollover Release',
          affected_agents: 1
        })
      ]);

      const applyResult = admin.applyAdminBenchmarkRollover(configResult.data.config.id);
      expect(applyResult.ok).toBe(true);

      const cohortAfter = queries.getCohortById(fixture.cohort.id)!;
      const agentAfter = queries.getAgentsWithModelsByCohort(fixture.cohort.id).find((item) => item.family_id === family.id)!;

      expect(cohortAfter.benchmark_config_id).toBe(configResult.data.config.id);
      expect(agentAfter.release_id).toBe(releaseResult.data.release.id);
      expect(agentAfter.model.release_name).toBe('Future Rollover Release');
    } finally {
      await ctx.cleanup();
    }
  });

  it('keeps decision, trade, and brier lineage frozen after the active agent release changes', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const fixture = await createSingleAgentFixture();
      const queries = await import('@/lib/db/queries');
      const admin = await import('@/lib/application/admin-benchmark');
      const markets = await import('@/lib/application/markets');
      const family = queries.resolveModelFamily(fixture.legacyModelId)!;
      const beforeAgent = queries.getAgentsWithModelsByCohort(fixture.cohort.id).find((item) => item.family_id === family.id)!;

      const market = queries.upsertMarket({
        polymarket_id: 'lineage-freeze-market',
        question: 'Will frozen lineage survive rollout?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.6,
        volume: 1000
      });

      const position = queries.upsertPosition(beforeAgent.id, market.id, 'YES', 10, 0.6, 6);
      const decision = queries.createDecision({
        agent_id: beforeAgent.id,
        cohort_id: fixture.cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'BET'
      });
      const trade = queries.createTrade({
        agent_id: beforeAgent.id,
        market_id: market.id,
        position_id: position.id,
        decision_id: decision.id,
        family_id: beforeAgent.family_id,
        release_id: beforeAgent.release_id,
        benchmark_config_model_id: beforeAgent.benchmark_config_model_id,
        trade_type: 'BUY',
        side: 'YES',
        shares: 10,
        price: 0.6,
        total_amount: 6,
        implied_confidence: 0.6
      });
      const brier = queries.createBrierScore({
        agent_id: beforeAgent.id,
        trade_id: trade.id,
        market_id: market.id,
        family_id: beforeAgent.family_id,
        release_id: beforeAgent.release_id,
        benchmark_config_model_id: beforeAgent.benchmark_config_model_id,
        forecast_probability: 0.6,
        actual_outcome: 1,
        brier_score: 0.16
      });

      const releaseResult = admin.createAdminModelReleaseRecord({
        family_id: family.id,
        release_name: 'Future Frozen Release',
        openrouter_id: `${family.provider.toLowerCase()}/future-frozen-release`,
        default_input_price_per_million: 11,
        default_output_price_per_million: 22
      });
      expect(releaseResult.ok).toBe(true);
      if (!releaseResult.ok) {
        return;
      }

      const { assignments } = await buildUpdatedConfigForFamily(family.id, releaseResult.data.release.id);
      const configResult = admin.createAdminBenchmarkConfigRecord({
        version_name: 'frozen-lineage-rollover',
        methodology_version: 'v1',
        assignments
      });
      expect(configResult.ok).toBe(true);
      if (!configResult.ok) {
        return;
      }

      const applyResult = admin.applyAdminBenchmarkRollover(configResult.data.config.id);
      expect(applyResult.ok).toBe(true);

      const afterAgent = queries.getAgentsWithModelsByCohort(fixture.cohort.id).find((item) => item.family_id === family.id)!;
      expect(afterAgent.release_id).toBe(releaseResult.data.release.id);

      const frozenDecision = queries.getDecisionById(decision.id)!;
      const frozenTrade = queries.getTradesByDecision(decision.id)[0]!;
      const frozenBrier = queries.getBrierScoresByAgent(beforeAgent.id)[0]!;

      expect(frozenDecision.release_id).toBe(beforeAgent.release_id);
      expect(frozenTrade.release_id).toBe(beforeAgent.release_id);
      expect(frozenBrier.release_id).toBe(beforeAgent.release_id);

      const marketDetail = markets.getMarketDetail(market.id);
      expect(marketDetail.status).toBe('ok');
      if (marketDetail.status !== 'ok') {
        return;
      }

      expect(marketDetail.data.trades[0]).toMatchObject({
        id: trade.id,
        model_release_name: beforeAgent.model.release_name
      });
      expect(marketDetail.data.brier_scores[0]).toMatchObject({
        id: brier.id,
        model_release_name: beforeAgent.model.release_name
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('emits release-change events with exact previous and next release names', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const fixture = await createSingleAgentFixture();
      const queries = await import('@/lib/db/queries');
      const admin = await import('@/lib/application/admin-benchmark');
      const performance = await import('@/lib/application/performance');
      const family = queries.resolveModelFamily(fixture.legacyModelId)!;
      const beforeAgent = queries.getAgentsWithModelsByCohort(fixture.cohort.id).find((item) => item.family_id === family.id)!;

      const decision = queries.createDecision({
        agent_id: beforeAgent.id,
        cohort_id: fixture.cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'HOLD'
      });
      queries.finalizeDecision(decision.id, {
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'HOLD'
      });

      const releaseResult = admin.createAdminModelReleaseRecord({
        family_id: family.id,
        release_name: 'Future Chart Release',
        openrouter_id: `${family.provider.toLowerCase()}/future-chart-release`,
        default_input_price_per_million: 13,
        default_output_price_per_million: 26
      });
      expect(releaseResult.ok).toBe(true);
      if (!releaseResult.ok) {
        return;
      }

      const { assignments } = await buildUpdatedConfigForFamily(family.id, releaseResult.data.release.id);
      const configResult = admin.createAdminBenchmarkConfigRecord({
        version_name: 'chart-release-shift',
        methodology_version: 'v1',
        assignments
      });
      expect(configResult.ok).toBe(true);
      if (!configResult.ok) {
        return;
      }

      const promoted = admin.promoteAdminBenchmarkConfig(configResult.data.config.id);
      expect(promoted.ok).toBe(true);

      const events = performance.getReleaseChangeEvents({ familyId: family.id });
      expect(events).toEqual([
        expect.objectContaining({
          model_id: family.slug ?? family.id,
          previous_release_name: beforeAgent.model.release_name,
          release_name: 'Future Chart Release'
        })
      ]);
    } finally {
      await ctx.cleanup();
    }
  });
});
