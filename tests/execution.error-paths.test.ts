import { describe, expect, it, vi } from 'vitest';

describe('engine/execution catch paths', () => {
  it('returns insufficient balance when amount exceeds cash but not max-bet cap', async () => {
    vi.doMock('@/lib/constants', async () => {
      const actual = await vi.importActual<typeof import('@/lib/constants')>('@/lib/constants');
      return {
        ...actual,
        MAX_BET_PERCENT: 2
      };
    });

    vi.doMock('@/lib/db', () => ({
      generateId: () => 'id',
      withTransaction: (fn: () => unknown) => fn(),
      logSystemEvent: vi.fn()
    }));

    vi.doMock('@/lib/db/queries', () => ({
      getAgentById: () => ({
        id: 'a1',
        cash_balance: 100,
        total_invested: 0,
        status: 'active'
      }),
      updateAgentBalance: vi.fn(),
      getMarketById: () => ({
        id: 'm1',
        market_type: 'binary',
        status: 'active',
        current_price: 0.5
      }),
      getPositionById: vi.fn(),
      upsertPosition: vi.fn(),
      reducePosition: vi.fn(),
      createTrade: vi.fn()
    }));

    try {
      const execution = await import('@/lib/engine/execution');
      const result = execution.executeBet('a1', {
        market_id: 'm1',
        side: 'YES',
        amount: 150
      });

      expect(result).toEqual({ success: false, error: 'Insufficient balance' });
    } finally {
      vi.doUnmock('@/lib/constants');
      vi.doUnmock('@/lib/db');
      vi.doUnmock('@/lib/db/queries');
      vi.resetModules();
    }
  });

  it('returns market not found when executeSell position points to missing market', async () => {
    vi.doMock('@/lib/db', () => ({
      generateId: () => 'id',
      withTransaction: (fn: () => unknown) => fn(),
      logSystemEvent: vi.fn()
    }));

    vi.doMock('@/lib/db/queries', () => ({
      getAgentById: () => ({
        id: 'a1',
        cash_balance: 10_000,
        total_invested: 0,
        status: 'active'
      }),
      updateAgentBalance: vi.fn(),
      getMarketById: () => undefined,
      getPositionById: () => ({
        id: 'p1',
        agent_id: 'a1',
        market_id: 'm-missing',
        side: 'YES',
        shares: 100,
        total_cost: 50,
        status: 'open'
      }),
      upsertPosition: vi.fn(),
      reducePosition: vi.fn(),
      createTrade: vi.fn()
    }));

    try {
      const execution = await import('@/lib/engine/execution');
      const result = execution.executeSell('a1', {
        position_id: 'p1',
        percentage: 50
      });

      expect(result).toEqual({ success: false, error: 'Market not found' });
    } finally {
      vi.doUnmock('@/lib/db');
      vi.doUnmock('@/lib/db/queries');
      vi.resetModules();
    }
  });

  it('returns a safe error result when executeBet transaction throws', async () => {
    const logSystemEvent = vi.fn();

    vi.doMock('@/lib/db', () => ({
      generateId: () => 'id',
      withTransaction: () => {
        throw new Error('tx failed on buy');
      },
      logSystemEvent
    }));

    vi.doMock('@/lib/db/queries', () => ({
      getAgentById: () => ({
        id: 'a1',
        cash_balance: 10_000,
        total_invested: 0,
        status: 'active'
      }),
      updateAgentBalance: vi.fn(),
      getMarketById: () => ({
        id: 'm1',
        market_type: 'binary',
        status: 'active',
        current_price: 0.5
      }),
      getPositionById: vi.fn(),
      upsertPosition: vi.fn(),
      reducePosition: vi.fn(),
      createTrade: vi.fn()
    }));

    try {
      const execution = await import('@/lib/engine/execution');
      const result = execution.executeBet('a1', {
        market_id: 'm1',
        side: 'YES',
        amount: 100
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('tx failed on buy');
      expect(logSystemEvent).toHaveBeenCalledWith(
        'trade_error',
        { agent_id: 'a1', error: 'tx failed on buy' },
        'error'
      );
    } finally {
      vi.doUnmock('@/lib/db');
      vi.doUnmock('@/lib/db/queries');
      vi.resetModules();
    }
  });

  it('returns a safe error result when executeSell transaction throws', async () => {
    const logSystemEvent = vi.fn();

    vi.doMock('@/lib/db', () => ({
      generateId: () => 'id',
      withTransaction: () => {
        throw new Error('tx failed on sell');
      },
      logSystemEvent
    }));

    vi.doMock('@/lib/db/queries', () => ({
      getAgentById: () => ({
        id: 'a1',
        cash_balance: 10_000,
        total_invested: 100,
        status: 'active'
      }),
      updateAgentBalance: vi.fn(),
      getMarketById: () => ({
        id: 'm1',
        market_type: 'binary',
        status: 'active',
        current_price: 0.6
      }),
      getPositionById: () => ({
        id: 'p1',
        agent_id: 'a1',
        market_id: 'm1',
        side: 'YES',
        shares: 100,
        total_cost: 50,
        status: 'open'
      }),
      upsertPosition: vi.fn(),
      reducePosition: vi.fn(),
      createTrade: vi.fn()
    }));

    try {
      const execution = await import('@/lib/engine/execution');
      const result = execution.executeSell('a1', {
        position_id: 'p1',
        percentage: 50
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('tx failed on sell');
      expect(logSystemEvent).toHaveBeenCalledWith(
        'trade_error',
        { agent_id: 'a1', error: 'tx failed on sell' },
        'error'
      );
    } finally {
      vi.doUnmock('@/lib/db');
      vi.doUnmock('@/lib/db/queries');
      vi.resetModules();
    }
  });

  it('handles non-Error throws in executeBet/executeSell catch blocks', async () => {
    const logSystemEvent = vi.fn();

    vi.doMock('@/lib/db', () => ({
      generateId: () => 'id',
      withTransaction: () => {
        throw 'string-failure';
      },
      logSystemEvent
    }));

    vi.doMock('@/lib/db/queries', () => ({
      getAgentById: () => ({
        id: 'a1',
        cash_balance: 10_000,
        total_invested: 100,
        status: 'active'
      }),
      updateAgentBalance: vi.fn(),
      getMarketById: () => ({
        id: 'm1',
        market_type: 'binary',
        status: 'active',
        current_price: 0.5
      }),
      getPositionById: () => ({
        id: 'p1',
        agent_id: 'a1',
        market_id: 'm1',
        side: 'YES',
        shares: 100,
        total_cost: 50,
        status: 'open'
      }),
      upsertPosition: vi.fn(),
      reducePosition: vi.fn(),
      createTrade: vi.fn()
    }));

    try {
      const execution = await import('@/lib/engine/execution');
      const buy = execution.executeBet('a1', {
        market_id: 'm1',
        side: 'YES',
        amount: 100
      });
      const sell = execution.executeSell('a1', {
        position_id: 'p1',
        percentage: 50
      });

      expect(buy).toEqual({ success: false, error: 'string-failure' });
      expect(sell).toEqual({ success: false, error: 'string-failure' });
      expect(logSystemEvent).toHaveBeenCalledWith(
        'trade_error',
        { agent_id: 'a1', error: 'string-failure' },
        'error'
      );
    } finally {
      vi.doUnmock('@/lib/db');
      vi.doUnmock('@/lib/db/queries');
      vi.resetModules();
    }
  });
});
