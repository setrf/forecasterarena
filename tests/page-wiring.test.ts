import React from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import AdminBenchmarkPageClient from '@/features/admin/benchmark/AdminBenchmarkPageClient';
import AdminDashboardPageClient from '@/features/admin/dashboard/AdminDashboardPageClient';
import CohortDetailPageClient from '@/features/cohorts/detail/CohortDetailPageClient';
import HomePageClient from '@/features/home/HomePageClient';
import MarketDetailPageClient from '@/features/markets/detail/MarketDetailPageClient';
import ModelDetailPageClient from '@/features/models/detail/ModelDetailPageClient';
import DecisionDetailPageClient from '@/features/decisions/detail/DecisionDetailPageClient';
import AgentCohortDetailPageClient from '@/features/cohorts/model-detail/AgentCohortDetailPageClient';
import { createSingleAgentFixture } from '@/tests/helpers/db-fixtures';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

describe('page wiring', () => {
  beforeAll(() => {
    Object.assign(globalThis, { React });
  });

  it('keeps the home route bound to the home feature shell', async () => {
    const module = await import('@/app/page');
    expect((module.default().type as { name?: string }).name).toBe(HomePageClient.name);
  });

  it('keeps the admin route bound to the admin dashboard feature shell', async () => {
    const module = await import('@/app/admin/page');
    expect((module.default().type as { name?: string }).name).toBe(AdminDashboardPageClient.name);
  });

  it('keeps the admin benchmark route bound to the benchmark feature shell', async () => {
    const module = await import('@/app/admin/benchmark/page');
    expect((module.default().type as { name?: string }).name).toBe(AdminBenchmarkPageClient.name);
  });

  it('keeps the detail routes bound to their feature shells and uses Next notFound for missing entities', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const fixture = await createSingleAgentFixture();
      const family = fixture.db.prepare(`
        SELECT slug
        FROM model_families
        WHERE legacy_model_id = ?
      `).get(fixture.legacyModelId) as { slug: string };
      const market = fixture.queries.upsertMarket({
        polymarket_id: `pm-page-wiring-${Date.now()}`,
        question: 'Will the detail route resolve through the server boundary?',
        close_date: '2030-01-01T00:00:00.000Z',
        status: 'active',
        current_price: 0.52,
        volume: 1000,
        liquidity: 500
      });
      const decision = fixture.queries.createDecision({
        agent_id: fixture.agent.id,
        cohort_id: fixture.cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'HOLD'
      });

      const marketPage = await import('@/app/markets/[id]/page');
      const cohortPage = await import('@/app/cohorts/[id]/page');
      const modelPage = await import('@/app/models/[id]/page');
      const decisionPage = await import('@/app/decisions/[id]/page');
      const cohortModelPage = await import('@/app/cohorts/[id]/models/[familySlugOrLegacyId]/page');

      const renderedMarket = await marketPage.default({
        params: Promise.resolve({ id: market.id })
      });
      expect((renderedMarket.type as { name?: string }).name).toBe(MarketDetailPageClient.name);

      const renderedCohort = await cohortPage.default({
        params: Promise.resolve({ id: fixture.cohort.id })
      });
      expect((renderedCohort.type as { name?: string }).name).toBe(CohortDetailPageClient.name);

      const renderedModel = await modelPage.default({
        params: Promise.resolve({ id: family.slug })
      });
      expect((renderedModel.type as { name?: string }).name).toBe(ModelDetailPageClient.name);

      const renderedDecision = await decisionPage.default({
        params: Promise.resolve({ id: decision.id })
      });
      expect((renderedDecision.type as { name?: string }).name).toBe(DecisionDetailPageClient.name);

      const renderedCohortModel = await cohortModelPage.default({
        params: Promise.resolve({ id: fixture.cohort.id, familySlugOrLegacyId: family.slug })
      });
      expect((renderedCohortModel.type as { name?: string }).name).toBe(AgentCohortDetailPageClient.name);

      await expect(marketPage.default({
        params: Promise.resolve({ id: 'missing-market' })
      })).rejects.toMatchObject({ digest: 'NEXT_NOT_FOUND' });

      await expect(cohortPage.default({
        params: Promise.resolve({ id: 'missing-cohort' })
      })).rejects.toMatchObject({ digest: 'NEXT_NOT_FOUND' });

      await expect(modelPage.default({
        params: Promise.resolve({ id: 'missing-model' })
      })).rejects.toMatchObject({ digest: 'NEXT_NOT_FOUND' });

      await expect(decisionPage.default({
        params: Promise.resolve({ id: 'missing-decision' })
      })).rejects.toMatchObject({ digest: 'NEXT_NOT_FOUND' });

      await expect(cohortModelPage.default({
        params: Promise.resolve({ id: fixture.cohort.id, familySlugOrLegacyId: 'missing-model' })
      })).rejects.toMatchObject({ digest: 'NEXT_NOT_FOUND' });
    } finally {
      await ctx.cleanup();
    }
  });
});
