import { describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

type QueryModule = typeof import('@/lib/db/queries');
type DbModule = typeof import('@/lib/db');
type ExecutionModule = typeof import('@/lib/engine/execution');

interface TestFixture {
  ctx: Awaited<ReturnType<typeof createIsolatedTestContext>>;
  queries: QueryModule;
  dbModule: DbModule;
  execution: ExecutionModule;
  db: ReturnType<DbModule['getDb']>;
  agent: ReturnType<QueryModule['createAgentsForCohort']>[number];
  otherAgent: ReturnType<QueryModule['createAgentsForCohort']>[number];
}

let marketCounter = 0;

function nextMarketId(prefix: string): string {
  marketCounter += 1;
  return `${prefix}-${Date.now()}-${marketCounter}`;
}

async function createFixture(): Promise<TestFixture> {
  const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
  const queries = await import('@/lib/db/queries');
  const dbModule = await import('@/lib/db');
  const execution = await import('@/lib/engine/execution');

  const cohort = queries.createCohort();
  const agents = queries.createAgentsForCohort(cohort.id);

  return {
    ctx,
    queries,
    dbModule,
    execution,
    db: dbModule.getDb(),
    agent: agents[0],
    otherAgent: agents[1]
  };
}

async function withFixture(fn: (fixture: TestFixture) => Promise<void>) {
  const fixture = await createFixture();
  try {
    await fn(fixture);
  } finally {
    await fixture.ctx.cleanup();
  }
}

function createBinaryMarket(
  queries: QueryModule,
  overrides: Partial<Parameters<QueryModule['upsertMarket']>[0]> = {}
) {
  return queries.upsertMarket({
    polymarket_id: nextMarketId('pm-binary'),
    question: 'Will scenario execute as expected?',
    market_type: 'binary',
    close_date: '2099-01-01T00:00:00.000Z',
    status: 'active',
    current_price: 0.6,
    volume: 1_000_000,
    ...overrides
  });
}

function createMultiOutcomeMarket(
  queries: QueryModule,
  overrides: Partial<Parameters<QueryModule['upsertMarket']>[0]> = {}
) {
  return queries.upsertMarket({
    polymarket_id: nextMarketId('pm-multi'),
    question: 'Who will win?',
    market_type: 'multi_outcome',
    outcomes: JSON.stringify(['A', 'B', 'C']),
    current_prices: JSON.stringify({ A: 0.4, B: 0.35, C: 0.25 }),
    close_date: '2099-01-01T00:00:00.000Z',
    status: 'active',
    volume: 2_000_000,
    ...overrides
  });
}

describe('engine/execution - executeBet', () => {
  it('rejects unknown agents', async () => {
    await withFixture(async ({ execution, queries }) => {
      const market = createBinaryMarket(queries);
      const result = execution.executeBet('missing-agent', {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      expect(result).toEqual({ success: false, error: 'Agent not found' });
    });
  });

  it('rejects bankrupt agents', async () => {
    await withFixture(async ({ execution, queries, agent, db }) => {
      const market = createBinaryMarket(queries);
      db.prepare(`UPDATE agents SET status = 'bankrupt' WHERE id = ?`).run(agent.id);

      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      expect(result).toEqual({ success: false, error: 'Agent is bankrupt' });
    });
  });

  it('rejects unknown markets', async () => {
    await withFixture(async ({ execution, agent }) => {
      const result = execution.executeBet(agent.id, {
        market_id: 'missing-market',
        side: 'YES',
        amount: 100
      });
      expect(result).toEqual({ success: false, error: 'Market not found' });
    });
  });

  it('rejects markets that are not active', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { status: 'closed' });
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      expect(result).toEqual({ success: false, error: 'Market is closed' });
    });
  });

  it('rejects non-positive bet amounts', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries);
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 0
      });
      expect(result).toEqual({ success: false, error: 'Bet amount must be positive' });
    });
  });

  it('rejects amounts above max bet percentage', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries);
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 3000
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Bet exceeds max/);
    });
  });

  it('rejects invalid binary sides', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries);
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'MAYBE',
        amount: 100
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid side/);
    });
  });

  it('rejects binary YES bets when executable price is 0', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 0 });
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid executable price 0/);
    });
  });

  it('rejects binary NO bets when executable price is 0', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 1 });
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'NO',
        amount: 100
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid executable price 0/);
    });
  });

  it('rejects null binary bet prices instead of inventing 50/50 odds', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: null });
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No executable price available/);
    });
  });

  it('rejects production-priced BETs when validated CLOB price is unavailable', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const priceOverrides = new Map([[`${market.id}:YES`, Number.NaN]]);
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      }, 'decision-1', priceOverrides);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No validated CLOB price available');
    });
  });

  it('normalizes binary side casing for storage', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const bet = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'yes',
        amount: 100
      });

      expect(bet.success).toBe(true);
      const position = queries.getPositionById(bet.position_id!);
      const latestTrade = queries.getTradesByAgent(agent.id, 1)[0];
      expect(position?.side).toBe('YES');
      expect(latestTrade.side).toBe('YES');
    });
  });

  it('rejects multi-outcome bets when side price is missing', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, {
        current_prices: JSON.stringify({ B: 0.35, C: 0.65 })
      });
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'A',
        amount: 100
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No price available for outcome "A"/);
    });
  });

  it('rejects multi-outcome bets when current_prices is empty', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, {
        current_prices: ''
      });
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'A',
        amount: 100
      });
      expect(result).toEqual({
        success: false,
        error: 'No price available for outcome "A" in multi-outcome market'
      });
    });
  });

  it('rejects multi-outcome bets when prices JSON is malformed', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, {
        current_prices: '{bad-json'
      });
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'A',
        amount: 100
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Failed to parse multi-outcome prices/);
    });
  });

  it('rejects multi-outcome bets when side price is zero', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, {
        current_prices: JSON.stringify({ A: 0, B: 0.6, C: 0.4 })
      });
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'A',
        amount: 100
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid price 0/);
    });
  });

  it('rejects multi-outcome bets when side price exceeds one', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, {
        current_prices: JSON.stringify({ A: 1.2, B: 0.2, C: 0.1 })
      });
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'A',
        amount: 100
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid price 1.2/);
    });
  });

  it('executes successful multi-outcome bets', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, {
        current_prices: JSON.stringify({ A: 0.4, B: 0.35, C: 0.25 })
      });
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'A',
        amount: 100
      });

      expect(result.success).toBe(true);
      expect(result.shares).toBeCloseTo(250, 6);
    });
  });

  it('executes a successful binary bet and updates balances', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 0.4 });
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });

      expect(result.success).toBe(true);
      expect(result.shares).toBeCloseTo(250, 6);

      const updatedAgent = queries.getAgentById(agent.id)!;
      expect(updatedAgent.cash_balance).toBeCloseTo(9900, 6);
      expect(updatedAgent.total_invested).toBeCloseTo(100, 6);
    });
  });

  it('initializes mark-to-market values so portfolio value stays stable before snapshots', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 0.4 });
      const result = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });

      expect(result.success).toBe(true);

      const position = queries.getPositionById(result.position_id!)!;
      expect(position.current_value).toBeCloseTo(100, 6);
      expect(position.unrealized_pnl).toBeCloseTo(0, 6);
      expect(queries.calculateActualPortfolioValue(agent.id)).toBeCloseTo(10_000, 6);
    });
  });
});

describe('engine/execution - executeSell', () => {
  it('rejects unknown agents', async () => {
    await withFixture(async ({ execution }) => {
      const result = execution.executeSell('missing-agent', {
        position_id: 'missing-position',
        percentage: 50
      });
      expect(result).toEqual({ success: false, error: 'Agent not found' });
    });
  });

  it('rejects unknown positions', async () => {
    await withFixture(async ({ execution, agent }) => {
      const result = execution.executeSell(agent.id, {
        position_id: 'missing-position',
        percentage: 50
      });
      expect(result).toEqual({ success: false, error: 'Position not found' });
    });
  });

  it('rejects selling a position owned by another agent', async () => {
    await withFixture(async ({ execution, queries, agent, otherAgent }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const buy = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      expect(buy.success).toBe(true);

      const result = execution.executeSell(otherAgent.id, {
        position_id: buy.position_id!,
        percentage: 50
      });
      expect(result).toEqual({
        success: false,
        error: 'Position does not belong to agent'
      });
    });
  });

  it('rejects sells on non-open positions', async () => {
    await withFixture(async ({ execution, queries, agent, db }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const buy = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      db.prepare(`UPDATE positions SET status = 'closed' WHERE id = ?`).run(buy.position_id);

      const result = execution.executeSell(agent.id, {
        position_id: buy.position_id!,
        percentage: 50
      });
      expect(result).toEqual({ success: false, error: 'Position is closed' });
    });
  });

  it('rejects invalid sell percentages', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const buy = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });

      const zero = execution.executeSell(agent.id, {
        position_id: buy.position_id!,
        percentage: 0
      });
      const over = execution.executeSell(agent.id, {
        position_id: buy.position_id!,
        percentage: 101
      });

      expect(zero).toEqual({ success: false, error: 'Sell percentage must be positive' });
      expect(over).toEqual({ success: false, error: 'Sell percentage cannot exceed 100%' });
    });
  });

  it('rejects sells when the underlying market is not active', async () => {
    await withFixture(async ({ execution, queries, agent, db }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const buy = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });

      db.prepare(`UPDATE markets SET status = 'closed' WHERE id = ?`).run(market.id);

      const result = execution.executeSell(agent.id, {
        position_id: buy.position_id!,
        percentage: 50
      });
      expect(result).toEqual({ success: false, error: 'Market is closed' });
    });
  });

  it('rejects sells when computed shares-to-sell is non-positive', async () => {
    await withFixture(async ({ execution, queries, agent, db }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const buy = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      db.prepare(`UPDATE positions SET shares = 0 WHERE id = ?`).run(buy.position_id);

      const result = execution.executeSell(agent.id, {
        position_id: buy.position_id!,
        percentage: 50
      });
      expect(result).toEqual({ success: false, error: 'No shares to sell' });
    });
  });

  it('rejects binary sells with invalid stored position side', async () => {
    await withFixture(async ({ execution, queries, agent, db }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const buy = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      db.prepare(`UPDATE positions SET side = 'MAYBE' WHERE id = ?`).run(buy.position_id);

      const result = execution.executeSell(agent.id, {
        position_id: buy.position_id!,
        percentage: 50
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid side "MAYBE"/);
    });
  });

  it('rejects binary sells with invalid current price', async () => {
    await withFixture(async ({ execution, queries, agent, db }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const buy = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      db.prepare(`UPDATE markets SET current_price = 1.2 WHERE id = ?`).run(market.id);

      const result = execution.executeSell(agent.id, {
        position_id: buy.position_id!,
        percentage: 50
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid current price/);
    });
  });

  it('rejects null binary sell prices instead of inventing 50/50 odds', async () => {
    await withFixture(async ({ execution, queries, agent, db }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const buy = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      expect(buy.success).toBe(true);
      db.prepare(`UPDATE markets SET current_price = NULL WHERE id = ?`).run(market.id);

      const result = execution.executeSell(agent.id, {
        position_id: buy.position_id!,
        percentage: 50
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No current price available/);
    });
  });

  it('rejects production-priced SELLs when validated CLOB price is unavailable', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const buy = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      expect(buy.success).toBe(true);

      const priceOverrides = new Map([[`${market.id}:YES`, Number.NaN]]);
      const result = execution.executeSell(agent.id, {
        position_id: buy.position_id!,
        percentage: 50
      }, 'decision-1', priceOverrides);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No validated CLOB price available');
    });
  });

  it('rejects multi-outcome sells when side price is missing', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, {
        current_prices: JSON.stringify({ B: 0.7, C: 0.3 })
      });
      const position = queries.upsertPosition(agent.id, market.id, 'A', 100, 0.4, 40);

      const result = execution.executeSell(agent.id, {
        position_id: position.id,
        percentage: 50
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No current price available for outcome "A"/);
    });
  });

  it('rejects multi-outcome sells when current_prices is empty', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, { current_prices: '' });
      const position = queries.upsertPosition(agent.id, market.id, 'A', 100, 0.4, 40);

      const result = execution.executeSell(agent.id, {
        position_id: position.id,
        percentage: 50
      });
      expect(result).toEqual({
        success: false,
        error: 'No current price available for outcome "A"'
      });
    });
  });

  it('rejects multi-outcome sells on malformed prices JSON', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, { current_prices: '{broken' });
      const position = queries.upsertPosition(agent.id, market.id, 'A', 100, 0.4, 40);

      const result = execution.executeSell(agent.id, {
        position_id: position.id,
        percentage: 50
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Failed to parse multi-outcome prices/);
    });
  });

  it('rejects multi-outcome sells when parsed current price is invalid', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, {
        current_prices: JSON.stringify({ A: -0.1, B: 0.6, C: 0.5 })
      });
      const position = queries.upsertPosition(agent.id, market.id, 'A', 100, 0.4, 40);

      const result = execution.executeSell(agent.id, {
        position_id: position.id,
        percentage: 50
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid current price -0.1/);
    });
  });

  it('rejects multi-outcome sells when parsed current price exceeds one', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, {
        current_prices: JSON.stringify({ A: 1.2, B: 0.2, C: 0.1 })
      });
      const position = queries.upsertPosition(agent.id, market.id, 'A', 100, 0.4, 40);

      const result = execution.executeSell(agent.id, {
        position_id: position.id,
        percentage: 50
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid current price 1.2/);
    });
  });

  it('executes successful multi-outcome sells', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, {
        current_prices: JSON.stringify({ A: 0.4, B: 0.35, C: 0.25 })
      });
      const position = queries.upsertPosition(agent.id, market.id, 'A', 100, 0.4, 40);

      const result = execution.executeSell(agent.id, {
        position_id: position.id,
        percentage: 50
      });
      expect(result.success).toBe(true);
      expect(result.proceeds).toBeCloseTo(20, 6);
    });
  });

  it('executes partial sells and keeps the position open', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 0.6 });
      const buy = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      expect(buy.success).toBe(true);

      const sell = execution.executeSell(agent.id, {
        position_id: buy.position_id!,
        percentage: 40
      });
      expect(sell.success).toBe(true);
      expect(sell.proceeds).toBeCloseTo(40, 6);

      const updatedAgent = queries.getAgentById(agent.id)!;
      expect(updatedAgent.cash_balance).toBeCloseTo(9940, 6);

      const position = queries.getPositionById(buy.position_id!)!;
      expect(position.status).toBe('open');
      expect(position.shares).toBeCloseTo(100, 6);
    });
  });

  it('keeps remaining position mtm in sync after partial sells', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 0.6 });
      const buy = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      expect(buy.success).toBe(true);

      const sell = execution.executeSell(agent.id, {
        position_id: buy.position_id!,
        percentage: 40
      });
      expect(sell.success).toBe(true);

      const position = queries.getPositionById(buy.position_id!)!;
      expect(position.current_value).toBeCloseTo(60, 6);
      expect(position.unrealized_pnl).toBeCloseTo(0, 6);
      expect(queries.calculateActualPortfolioValue(agent.id)).toBeCloseTo(10_000, 6);
    });
  });

  it('executes full sells and closes the position', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const buy = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      expect(buy.success).toBe(true);

      const sell = execution.executeSell(agent.id, {
        position_id: buy.position_id!,
        percentage: 100
      });
      expect(sell.success).toBe(true);

      const position = queries.getPositionById(buy.position_id!)!;
      expect(position.status).toBe('closed');
      expect(position.shares).toBe(0);
      expect(position.total_cost).toBe(0);
    });
  });

  it('uses String(e) when multi-outcome JSON parsing throws non-Error values', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createMultiOutcomeMarket(queries, {
        current_prices: JSON.stringify({ A: 0.4, B: 0.35, C: 0.25 })
      });
      const position = queries.upsertPosition(agent.id, market.id, 'A', 100, 0.4, 40);
      const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation(() => {
        throw 'string-parse-failure';
      });

      try {
        const bet = execution.executeBet(agent.id, {
          market_id: market.id,
          side: 'A',
          amount: 100
        });
        const sell = execution.executeSell(agent.id, {
          position_id: position.id,
          percentage: 50
        });

        expect(bet).toEqual({
          success: false,
          error: 'Failed to parse multi-outcome prices: string-parse-failure'
        });
        expect(sell).toEqual({
          success: false,
          error: 'Failed to parse multi-outcome prices: string-parse-failure'
        });
      } finally {
        parseSpy.mockRestore();
      }
    });
  });

  it('executes batch BET instructions through executeBets', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const results = execution.executeBets(agent.id, [
        { market_id: market.id, side: 'YES', amount: 100 },
        { market_id: market.id, side: 'NO', amount: 100 }
      ]);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  it('rejects over-allocated atomic BET batches without creating trades', async () => {
    await withFixture(async ({ execution, queries, agent, db }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const results = execution.executeBetsAtomically(agent.id, [
        { market_id: market.id, side: 'YES', amount: 1_500 },
        { market_id: market.id, side: 'NO', amount: 1_500 }
      ]);
      const agentAfter = queries.getAgentById(agent.id)!;
      const counts = db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM trades WHERE agent_id = ?) as trades,
          (SELECT COUNT(*) FROM positions WHERE agent_id = ?) as positions
      `).get(agent.id, agent.id) as { trades: number; positions: number };

      expect(results).toEqual([
        {
          success: false,
          error: 'BET batch failed; no trades executed: Total BET amount $3000.00 exceeds maximum decision allocation $2500.00'
        }
      ]);
      expect(counts).toEqual({ trades: 0, positions: 0 });
      expect(agentAfter.cash_balance).toBe(agent.cash_balance);
      expect(agentAfter.total_invested).toBe(agent.total_invested);
    });
  });

  it('rolls back atomic BET batches when a later leg fails', async () => {
    await withFixture(async ({ execution, queries, agent, db }) => {
      const activeMarket = createBinaryMarket(queries, {
        current_price: 0.5,
        status: 'active'
      });
      const closedMarket = createBinaryMarket(queries, {
        current_price: 0.5,
        status: 'closed'
      });

      const results = execution.executeBetsAtomically(agent.id, [
        { market_id: activeMarket.id, side: 'YES', amount: 100 },
        { market_id: closedMarket.id, side: 'NO', amount: 100 }
      ]);
      const agentAfter = queries.getAgentById(agent.id)!;
      const counts = db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM trades WHERE agent_id = ?) as trades,
          (SELECT COUNT(*) FROM positions WHERE agent_id = ?) as positions
      `).get(agent.id, agent.id) as { trades: number; positions: number };

      expect(results).toEqual([
        {
          success: false,
          error: 'BET batch failed; no trades executed: Market is closed'
        }
      ]);
      expect(counts).toEqual({ trades: 0, positions: 0 });
      expect(agentAfter.cash_balance).toBe(agent.cash_balance);
      expect(agentAfter.total_invested).toBe(agent.total_invested);
    });
  });

  it('executes batch SELL instructions through executeSells', async () => {
    await withFixture(async ({ execution, queries, agent }) => {
      const market = createBinaryMarket(queries, { current_price: 0.5 });
      const buy1 = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'YES',
        amount: 100
      });
      const buy2 = execution.executeBet(agent.id, {
        market_id: market.id,
        side: 'NO',
        amount: 100
      });

      const results = execution.executeSells(agent.id, [
        { position_id: buy1.position_id!, percentage: 100 },
        { position_id: buy2.position_id!, percentage: 100 }
      ]);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });
});
