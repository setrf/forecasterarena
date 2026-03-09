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

function snapshotIso(iso: string): string {
  return new Date(iso).toISOString();
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
          snapshot_timestamp: snapshotIso(timestamp),
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
          snapshot_timestamp: snapshotIso(timestamp),
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
});
