import React from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import AdminBenchmarkPageClient from '@/features/admin/benchmark/AdminBenchmarkPageClient';
import AdminDashboardPageClient from '@/features/admin/dashboard/AdminDashboardPageClient';
import CohortDetailPageClient from '@/features/cohorts/detail/CohortDetailPageClient';
import HomePageClient from '@/features/home/HomePageClient';
import MarketDetailPageClient from '@/features/markets/detail/MarketDetailPageClient';
import ModelDetailPageClient from '@/features/models/detail/ModelDetailPageClient';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

describe('page wiring', () => {
  beforeAll(() => {
    Object.assign(globalThis, { React });
  });

  it('keeps the home route bound to the home feature shell', async () => {
    const module = await import('@/app/page');
    expect(module.default().type).toBe(HomePageClient);
  });

  it('keeps the admin route bound to the admin dashboard feature shell', async () => {
    const module = await import('@/app/admin/page');
    expect(module.default().type).toBe(AdminDashboardPageClient);
  });

  it('keeps the admin benchmark route bound to the benchmark feature shell', async () => {
    const module = await import('@/app/admin/benchmark/page');
    expect(module.default().type).toBe(AdminBenchmarkPageClient);
  });

  it('keeps the market detail route bound to the market detail feature shell', async () => {
    const module = await import('@/app/markets/[id]/page');
    expect(module.default().type).toBe(MarketDetailPageClient);
  });

  it('keeps the cohort detail route bound to the cohort detail feature shell', async () => {
    const module = await import('@/app/cohorts/[id]/page');
    expect(module.default().type).toBe(CohortDetailPageClient);
  });

  it('keeps the model detail route bound to the model detail feature shell', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const module = await import('@/app/models/[id]/page');
      const rendered = await module.default({
        params: Promise.resolve({ id: 'openai-gpt' })
      });

      expect((rendered.type as { name?: string }).name).toBe('ModelDetailPageClient');
    } finally {
      await ctx.cleanup();
    }
  });
});
