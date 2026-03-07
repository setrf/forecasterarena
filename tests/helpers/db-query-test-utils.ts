import { createIsolatedTestContext } from '@/tests/helpers/test-context';

type DbModule = typeof import('@/lib/db');
type AgentsModule = typeof import('@/lib/db/queries/agents');
type CohortsModule = typeof import('@/lib/db/queries/cohorts');
type DecisionsModule = typeof import('@/lib/db/queries/decisions');
type MarketsModule = typeof import('@/lib/db/queries/markets');
type ModelsModule = typeof import('@/lib/db/queries/models');
type PositionsModule = typeof import('@/lib/db/queries/positions');
type SnapshotsModule = typeof import('@/lib/db/queries/snapshots');
type TradesModule = typeof import('@/lib/db/queries/trades');

export type MarketUpsertInput = Parameters<MarketsModule['upsertMarket']>[0];

export interface LoadedDbQueryModules {
  agents: AgentsModule;
  cohorts: CohortsModule;
  db: ReturnType<DbModule['getDb']>;
  decisions: DecisionsModule;
  markets: MarketsModule;
  models: ModelsModule;
  positions: PositionsModule;
  snapshots: SnapshotsModule;
  trades: TradesModule;
}

let sequence = 0;

export function uniqueId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

export async function withDbQueryModules(
  run: (modules: LoadedDbQueryModules) => Promise<void> | void
): Promise<void> {
  const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

  try {
    const dbModule = await import('@/lib/db');
    const [
      agents,
      cohorts,
      decisions,
      markets,
      models,
      positions,
      snapshots,
      trades
    ] = await Promise.all([
      import('@/lib/db/queries/agents'),
      import('@/lib/db/queries/cohorts'),
      import('@/lib/db/queries/decisions'),
      import('@/lib/db/queries/markets'),
      import('@/lib/db/queries/models'),
      import('@/lib/db/queries/positions'),
      import('@/lib/db/queries/snapshots'),
      import('@/lib/db/queries/trades')
    ]);

    await run({
      agents,
      cohorts,
      db: dbModule.getDb(),
      decisions,
      markets,
      models,
      positions,
      snapshots,
      trades
    });
  } finally {
    await ctx.cleanup();
  }
}

export function createMarket(
  markets: MarketsModule,
  overrides: Partial<MarketUpsertInput> = {}
) {
  return markets.upsertMarket({
    polymarket_id: uniqueId('pm'),
    question: uniqueId('question'),
    close_date: '2030-01-01T00:00:00.000Z',
    status: 'active',
    current_price: 0.55,
    volume: 1000,
    liquidity: 500,
    ...overrides
  });
}
