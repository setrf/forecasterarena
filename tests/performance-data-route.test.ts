import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';
import { createSingleAgentFixture } from '@/tests/helpers/db-fixtures';

async function withPerformanceFixture(
  run: (fixture: {
    queries: typeof import('@/lib/db/queries');
    route: typeof import('@/app/api/performance-data/route');
    cohort: Awaited<ReturnType<typeof createSingleAgentFixture>>['cohort'];
    agent: Awaited<ReturnType<typeof createSingleAgentFixture>>['agent'];
  }) => Promise<void>
) {
  const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

  try {
    const fixture = await createSingleAgentFixture();
    const route = await import('@/app/api/performance-data/route');

    await run({
      queries: fixture.queries,
      route,
      cohort: fixture.cohort,
      agent: fixture.agent
    });
  } finally {
    await ctx.cleanup();
  }
}

function snapshotTimestamp(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

describe('performance data route', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('honors short intraday ranges with timestamp precision', async () => {
    await withPerformanceFixture(async ({ agent, queries, route }) => {
      const snapshots = [
        '2026-03-05T11:55:00.000Z',
        '2026-03-05T11:30:00.000Z',
        '2026-03-05T10:00:00.000Z',
        '2026-03-03T12:00:00.000Z',
        '2026-02-23T12:00:00.000Z',
        '2026-01-24T12:00:00.000Z',
        '2025-11-05T12:00:00.000Z'
      ];

      snapshots.forEach((timestamp, index) => {
        queries.createPortfolioSnapshot({
          agent_id: agent.id,
          snapshot_timestamp: snapshotTimestamp(timestamp),
          cash_balance: 10_000 + index,
          positions_value: 0,
          total_value: 10_000 + index,
          total_pnl: index,
          total_pnl_percent: index / 100
        });
      });

      const tenMinuteResponse = await route.GET(
        new Request('http://localhost/api/performance-data?range=10M') as any
      );
      const tenMinuteData = await tenMinuteResponse.json();
      expect(tenMinuteResponse.status).toBe(200);
      expect(tenMinuteData.range).toBe('10M');
      expect(tenMinuteData.data).toHaveLength(1);
      expect(tenMinuteData.data[0].date).toBe('2026-03-05 11:50:00');

      const oneHourResponse = await route.GET(
        new Request('http://localhost/api/performance-data?range=1H') as any
      );
      const oneHourData = await oneHourResponse.json();
      expect(oneHourData.data.map((row: { date: string }) => row.date)).toEqual([
        '2026-03-05 11:30:00',
        '2026-03-05 11:50:00'
      ]);

      const oneDayResponse = await route.GET(
        new Request('http://localhost/api/performance-data?range=1D') as any
      );
      const oneDayData = await oneDayResponse.json();
      expect(oneDayData.data.map((row: { date: string }) => row.date)).toEqual([
        '2026-03-05 10:00:00',
        '2026-03-05 11:30:00',
        '2026-03-05 11:50:00'
      ]);
    });
  });

  it('anchors ranges to the latest available snapshot instead of wall-clock time', async () => {
    vi.setSystemTime(new Date('2026-03-10T12:00:00.000Z'));

    await withPerformanceFixture(async ({ agent, queries, route }) => {
      const snapshots = [
        '2026-03-05T11:55:00.000Z',
        '2026-03-05T10:00:00.000Z',
        '2026-03-04T11:30:00.000Z'
      ];

      snapshots.forEach((timestamp, index) => {
        queries.createPortfolioSnapshot({
          agent_id: agent.id,
          snapshot_timestamp: snapshotTimestamp(timestamp),
          cash_balance: 10_000 + index,
          positions_value: 0,
          total_value: 10_000 + index,
          total_pnl: index,
          total_pnl_percent: index / 100
        });
      });

      const response = await route.GET(
        new Request('http://localhost/api/performance-data?range=1D') as any
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.data.map((row: { date: string }) => row.date)).toEqual([
        '2026-03-05 10:00:00',
        '2026-03-05 11:50:00'
      ]);
    });
  });

  it('returns the correct windows for weekly, monthly, quarterly, and all-time ranges', async () => {
    await withPerformanceFixture(async ({ agent, cohort, queries, route }) => {
      const snapshots = [
        '2026-03-05T11:55:00.000Z',
        '2026-03-03T12:00:00.000Z',
        '2026-02-23T12:00:00.000Z',
        '2026-01-24T12:00:00.000Z',
        '2025-11-05T12:00:00.000Z'
      ];

      snapshots.forEach((timestamp, index) => {
        queries.createPortfolioSnapshot({
          agent_id: agent.id,
          snapshot_timestamp: snapshotTimestamp(timestamp),
          cash_balance: 10_100 + index,
          positions_value: 0,
          total_value: 10_100 + index,
          total_pnl: 100 + index,
          total_pnl_percent: 1 + index / 100
        });
      });

      const weekly = await route.GET(
        new Request(`http://localhost/api/performance-data?range=1W&cohort_id=${cohort.id}`) as any
      );
      const weeklyData = await weekly.json();
      expect(weeklyData.data.map((row: { date: string }) => row.date)).toEqual([
        '2026-03-03 12:00:00',
        '2026-03-05 11:00:00'
      ]);

      const monthly = await route.GET(
        new Request('http://localhost/api/performance-data?range=1M') as any
      );
      const monthlyData = await monthly.json();
      expect(monthlyData.data.map((row: { date: string }) => row.date)).toEqual([
        '2026-02-23 12:00:00',
        '2026-03-03 12:00:00',
        '2026-03-05 06:00:00'
      ]);

      const quarterly = await route.GET(
        new Request('http://localhost/api/performance-data?range=3M') as any
      );
      const quarterlyData = await quarterly.json();
      expect(quarterlyData.data.map((row: { date: string }) => row.date)).toEqual([
        '2026-01-24 00:00:00',
        '2026-02-23 00:00:00',
        '2026-03-03 00:00:00',
        '2026-03-05 00:00:00'
      ]);

      const allTime = await route.GET(
        new Request('http://localhost/api/performance-data?range=ALL') as any
      );
      const allTimeData = await allTime.json();
      expect(allTimeData.data.map((row: { date: string }) => row.date)).toEqual([
        '2025-10-30 00:00:00',
        '2026-01-22 00:00:00',
        '2026-02-19 00:00:00',
        '2026-02-26 00:00:00',
        '2026-03-05 00:00:00'
      ]);
    });
  });

  it('supports cohort, family, and cohort-family scoped chart requests', async () => {
    await withPerformanceFixture(async ({ agent, cohort, queries, route }) => {
      queries.createPortfolioSnapshot({
        agent_id: agent.id,
        snapshot_timestamp: snapshotTimestamp('2026-03-05T11:55:00.000Z'),
        cash_balance: 10_250,
        positions_value: 0,
        total_value: 10_250,
        total_pnl: 250,
        total_pnl_percent: 2.5
      });

      const familyScoped = await route.GET(
        new Request(`http://localhost/api/performance-data?range=1M&family_id=${agent.family_id}`) as any
      );
      const familyPayload = await familyScoped.json();
      expect(familyScoped.status).toBe(200);
      expect(familyScoped.headers.get('server-timing')).toContain('cache;desc="scoped"');
      expect(familyPayload.data).toHaveLength(1);
      expect(familyPayload.models).toEqual([
        expect.objectContaining({ family_id: agent.family_id })
      ]);

      const cohortAndFamilyScoped = await route.GET(
        new Request(`http://localhost/api/performance-data?range=1M&cohort_id=${cohort.id}&family_id=${agent.family_id}`) as any
      );
      const cohortAndFamilyPayload = await cohortAndFamilyScoped.json();
      expect(cohortAndFamilyScoped.status).toBe(200);
      expect(cohortAndFamilyPayload.data).toEqual(familyPayload.data);
    });
  });

  it('serves persisted global chart cache entries without recomputing on user requests', async () => {
    await withPerformanceFixture(async ({ agent, queries, route }) => {
      const dbModule = await import('@/lib/db');
      const db = dbModule.getDb();

      queries.createPortfolioSnapshot({
        agent_id: agent.id,
        snapshot_timestamp: snapshotTimestamp('2026-03-05T11:55:00.000Z'),
        cash_balance: 10_500,
        positions_value: 0,
        total_value: 10_500,
        total_pnl: 500,
        total_pnl_percent: 5
      });

      db.prepare(`
        INSERT INTO performance_chart_cache (
          cache_key, cohort_id, range_key, payload_json, generated_at
        ) VALUES (?, NULL, ?, ?, ?)
      `).run(
        '1M::all',
        '1M',
        JSON.stringify([{ date: '2000-01-01 00:00:00', stale: 1 }]),
        '2026-03-05 11:59:00'
      );

      const response = await route.GET(
        new Request('http://localhost/api/performance-data?range=1M') as any
      );
      const payload = await response.json();

      expect(payload.data).toEqual([{ date: '2000-01-01 00:00:00', stale: 1 }]);
      expect(response.headers.get('server-timing')).toContain('cache;desc="persisted-hit"');

      const refreshedCache = db.prepare(`
        SELECT payload_json
        FROM performance_chart_cache
        WHERE cache_key = ?
      `).get('1M::all') as { payload_json: string };

      expect(JSON.parse(refreshedCache.payload_json)).toMatchObject({
        data: [{ date: '2000-01-01 00:00:00', stale: 1 }],
        range: '1M'
      });
    });
  });

  it('computes and stores global chart data on persisted cache miss', async () => {
    await withPerformanceFixture(async ({ agent, queries, route }) => {
      const dbModule = await import('@/lib/db');
      const db = dbModule.getDb();

      queries.createPortfolioSnapshot({
        agent_id: agent.id,
        snapshot_timestamp: snapshotTimestamp('2026-03-05T11:55:00.000Z'),
        cash_balance: 10_500,
        positions_value: 0,
        total_value: 10_500,
        total_pnl: 500,
        total_pnl_percent: 5
      });

      const response = await route.GET(
        new Request('http://localhost/api/performance-data?range=1M') as any
      );
      const payload = await response.json();

      expect(payload.data).toEqual([
        expect.objectContaining({
          date: '2026-03-05 06:00:00'
        })
      ]);
      expect(response.headers.get('server-timing')).toContain('cache;desc="miss"');

      const cached = db.prepare(`
        SELECT payload_json
        FROM performance_chart_cache
        WHERE cache_key = ?
      `).get('1M::all') as { payload_json: string };

      expect(JSON.parse(cached.payload_json)).toMatchObject({
        data: payload.data,
        range: '1M'
      });
    });
  });

  it('does not append current default release changes onto historical cohort charts', async () => {
    await withPerformanceFixture(async ({ agent, cohort, queries, route }) => {
      const benchmarkConfigs = await import('@/lib/db/queries/benchmark-configs');
      const modelFamilies = await import('@/lib/db/queries/model-families');
      const modelReleases = await import('@/lib/db/queries/model-releases');

      queries.createDecision({
        agent_id: agent.id,
        cohort_id: cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'HOLD',
        reasoning: 'Historical cohort decision'
      });

      const family = modelFamilies.getModelFamilyById(agent.family_id)!;
      const currentRelease = modelReleases.getModelReleaseById(agent.release_id)!;
      const nextRelease = modelReleases.createModelRelease({
        id: `${currentRelease.id}-next`,
        family_id: family.id,
        release_name: `${currentRelease.release_name} Next`,
        release_slug: `${currentRelease.release_slug}-next`,
        openrouter_id: `${currentRelease.openrouter_id}-next`,
        provider: currentRelease.provider,
        release_status: 'active'
      });

      const config = benchmarkConfigs.createBenchmarkConfig({
        version_name: `future-default-${Date.now()}`,
        methodology_version: 'v1',
        created_by: 'vitest',
        is_default_for_future_cohorts: true
      });
      benchmarkConfigs.createBenchmarkConfigModel({
        benchmark_config_id: config.id,
        family_id: family.id,
        release_id: nextRelease.id,
        slot_order: 0,
        family_display_name_snapshot: family.public_display_name,
        short_display_name_snapshot: family.short_display_name,
        release_display_name_snapshot: nextRelease.release_name,
        provider_snapshot: nextRelease.provider,
        color_snapshot: family.color,
        openrouter_id_snapshot: nextRelease.openrouter_id,
        input_price_per_million_snapshot: 0,
        output_price_per_million_snapshot: 0
      });

      const response = await route.GET(
        new Request(`http://localhost/api/performance-data?range=1M&cohort_id=${cohort.id}`) as any
      );
      const payload = await response.json();

      expect(payload.release_changes).toEqual([]);
    });
  });
});
