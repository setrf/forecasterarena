/**
 * Database Query Helpers
 * 
 * This module provides all database operations for Forecaster Arena.
 * Queries are organized by entity (cohorts, agents, markets, etc.).
 * 
 * @module db/queries
 */

import { getDb, generateId } from './index';
import type {
  Cohort,
  Model,
  Agent,
  Market,
  Position,
  Trade,
  Decision,
  PortfolioSnapshot,
  BrierScoreRecord,
  ApiCost,
  SystemLog,
  AgentWithModel,
  PositionWithMarket,
  LeaderboardEntry,
  CohortSummary
} from '../types';
import { INITIAL_BALANCE, METHODOLOGY_VERSION } from '../constants';

// ============================================================================
// COHORT QUERIES
// ============================================================================

/**
 * Get all cohorts ordered by start date (newest first)
 */
export function getAllCohorts(limit: number = 100): Cohort[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM cohorts
    ORDER BY started_at DESC
    LIMIT ?
  `).all(limit) as Cohort[];
}

/**
 * Get active cohorts (not completed)
 */
export function getActiveCohorts(): Cohort[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM cohorts
    WHERE status = 'active'
    ORDER BY started_at DESC
  `).all() as Cohort[];
}

/**
 * Get a cohort by ID
 */
export function getCohortById(id: string): Cohort | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id) as Cohort | undefined;
}

/**
 * Get a cohort by number
 */
export function getCohortByNumber(cohortNumber: number): Cohort | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM cohorts WHERE cohort_number = ?').get(cohortNumber) as Cohort | undefined;
}

/**
 * Get cohort for the current week (Sunday-based)
 * Returns a cohort if one was started this week, undefined otherwise.
 * Used for idempotency check in start-cohort cron.
 */
export function getCohortForCurrentWeek(): Cohort | undefined {
  const db = getDb();

  // Calculate the start of the current week (Sunday 00:00 UTC)
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - dayOfWeek);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekStartISO = weekStart.toISOString();

  return db.prepare(`
    SELECT * FROM cohorts
    WHERE started_at >= ?
    ORDER BY started_at ASC
    LIMIT 1
  `).get(weekStartISO) as Cohort | undefined;
}

/**
 * Get the latest cohort number
 */
export function getLatestCohortNumber(): number {
  const db = getDb();
  const result = db.prepare('SELECT MAX(cohort_number) as max FROM cohorts').get() as { max: number | null };
  return result.max || 0;
}

/**
 * Create a new cohort
 */
export function createCohort(): Cohort {
  const db = getDb();
  const id = generateId();
  const cohortNumber = getLatestCohortNumber() + 1;

  // Normalize to midnight UTC for clean week calculations
  // This ensures decisions on subsequent Sundays at 00:00 will be Week 2, 3, etc.
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const startedAt = now.toISOString();

  db.prepare(`
    INSERT INTO cohorts (id, cohort_number, started_at, methodology_version)
    VALUES (?, ?, ?, ?)
  `).run(id, cohortNumber, startedAt, METHODOLOGY_VERSION);

  return getCohortById(id)!;
}

/**
 * Mark a cohort as completed
 */
export function completeCohort(id: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE cohorts
    SET status = 'completed', completed_at = ?
    WHERE id = ?
  `).run(now, id);
}

// ============================================================================
// MODEL QUERIES
// ============================================================================

/**
 * Get all models
 */
export function getAllModels(): Model[] {
  const db = getDb();
  return db.prepare('SELECT * FROM models ORDER BY display_name').all() as Model[];
}

/**
 * Get active models
 */
export function getActiveModels(): Model[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM models
    WHERE is_active = 1
    ORDER BY display_name
  `).all() as Model[];
}

/**
 * Get a model by ID
 */
export function getModelById(id: string): Model | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM models WHERE id = ?').get(id) as Model | undefined;
}

// ============================================================================
// AGENT QUERIES
// ============================================================================

/**
 * Get all agents for a cohort
 */
export function getAgentsByCohort(cohortId: string): Agent[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM agents
    WHERE cohort_id = ?
    ORDER BY cash_balance DESC
  `).all(cohortId) as Agent[];
}

/**
 * Get agents with model info for a cohort
 */
export function getAgentsWithModelsByCohort(cohortId: string): AgentWithModel[] {
  const db = getDb();
  return db.prepare(`
    SELECT 
      a.*,
      m.id as model_id,
      m.openrouter_id as model_openrouter_id,
      m.display_name as model_display_name,
      m.provider as model_provider,
      m.color as model_color,
      m.is_active as model_is_active
    FROM agents a
    JOIN models m ON a.model_id = m.id
    WHERE a.cohort_id = ?
    ORDER BY a.cash_balance DESC
  `).all(cohortId).map(row => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      cohort_id: r.cohort_id as string,
      model_id: r.model_id as string,
      cash_balance: r.cash_balance as number,
      total_invested: r.total_invested as number,
      status: r.status as 'active' | 'bankrupt',
      created_at: r.created_at as string,
      model: {
        id: r.model_id as string,
        openrouter_id: r.model_openrouter_id as string,
        display_name: r.model_display_name as string,
        provider: r.model_provider as string,
        color: r.model_color as string | null,
        is_active: r.model_is_active as number,
        added_at: ''
      }
    } as AgentWithModel;
  });
}

/**
 * Get an agent by ID
 */
export function getAgentById(id: string): Agent | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent | undefined;
}

/**
 * Get agent by cohort and model
 */
export function getAgentByCohortAndModel(cohortId: string, modelId: string): Agent | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM agents
    WHERE cohort_id = ? AND model_id = ?
  `).get(cohortId, modelId) as Agent | undefined;
}

/**
 * Create agents for all models in a cohort
 */
export function createAgentsForCohort(cohortId: string): Agent[] {
  const db = getDb();
  const models = getActiveModels();
  const agents: Agent[] = [];

  for (const model of models) {
    const id = generateId();

    db.prepare(`
      INSERT INTO agents (id, cohort_id, model_id, cash_balance, total_invested, status)
      VALUES (?, ?, ?, ?, 0, 'active')
    `).run(id, cohortId, model.id, INITIAL_BALANCE);

    agents.push(getAgentById(id)!);
  }

  return agents;
}

/**
 * Update agent balance after a trade
 * 
 * Status logic:
 * - 'active': Can make new bets (has enough cash for minimum bet)
 * - 'bankrupt': Zero value remaining (cash + invested = 0)
 * - Note: An agent with $0 cash but open positions is still 'active'
 *         because those positions may resolve profitably
 */
export function updateAgentBalance(id: string, cashBalance: number, totalInvested: number): void {
  const db = getDb();

  // Import MIN_BET to check if agent can still trade
  const MIN_BET = 50; // Hardcoded to avoid circular import

  // Determine status
  let status: 'active' | 'bankrupt';

  if (cashBalance <= 0 && totalInvested <= 0) {
    // Truly bankrupt: no cash and no positions
    status = 'bankrupt';
  } else {
    // Still active - may have positions that could recover
    status = 'active';
  }

  // Log warning if agent can't afford minimum bet but isn't bankrupt
  if (status === 'active' && cashBalance < MIN_BET && totalInvested > 0) {
    console.warn(
      `[Agent ${id}] Cannot afford minimum bet ($${MIN_BET}). ` +
      `Cash: $${cashBalance.toFixed(2)}, Invested: $${totalInvested.toFixed(2)}. ` +
      `Agent must wait for positions to resolve.`
    );
  }

  db.prepare(`
    UPDATE agents
    SET cash_balance = ?, total_invested = ?, status = ?
    WHERE id = ?
  `).run(cashBalance, totalInvested, status, id);
}

/**
 * Calculate actual portfolio value for an agent
 *
 * Returns: cash_balance + sum of current position values
 *
 * This is the CORRECT way to calculate portfolio value.
 * DO NOT use cash_balance + total_invested (which is cost basis, not current value).
 */
export function calculateActualPortfolioValue(agentId: string): number {
  const db = getDb();

  // Get agent's cash balance
  const agent = db.prepare(`
    SELECT cash_balance FROM agents WHERE id = ?
  `).get(agentId) as { cash_balance: number } | undefined;

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  // Get sum of open position values
  const positionValueResult = db.prepare(`
    SELECT COALESCE(SUM(current_value), 0) as total_position_value
    FROM positions
    WHERE agent_id = ? AND status = 'open'
  `).get(agentId) as { total_position_value: number };

  return agent.cash_balance + positionValueResult.total_position_value;
}

// ============================================================================
// MARKET QUERIES
// ============================================================================

/**
 * Get all markets
 */
export function getAllMarkets(limit: number = 1000): Market[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM markets
    ORDER BY volume DESC NULLS LAST
    LIMIT ?
  `).all(limit) as Market[];
}

/**
 * Get active markets
 */
export function getActiveMarkets(limit: number = 500): Market[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM markets
    WHERE status = 'active'
    ORDER BY volume DESC NULLS LAST
    LIMIT ?
  `).all(limit) as Market[];
}

/**
 * Get top N markets by volume
 */
export function getTopMarketsByVolume(limit: number): Market[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM markets
    WHERE status = 'active'
    ORDER BY volume DESC NULLS LAST
    LIMIT ?
  `).all(limit) as Market[];
}

/**
 * Get a market by ID
 */
export function getMarketById(id: string): Market | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM markets WHERE id = ?').get(id) as Market | undefined;
}

/**
 * Get a market by Polymarket ID
 */
export function getMarketByPolymarketId(polymarketId: string): Market | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM markets WHERE polymarket_id = ?').get(polymarketId) as Market | undefined;
}

/**
 * Upsert a market (insert or update)
 */
export function upsertMarket(market: Partial<Market> & { polymarket_id: string }): Market {
  const db = getDb();
  const existing = getMarketByPolymarketId(market.polymarket_id);

  if (existing) {
    // Update
    db.prepare(`
      UPDATE markets
      SET slug = COALESCE(?, slug),
          event_slug = COALESCE(?, event_slug),
          question = COALESCE(?, question),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          market_type = COALESCE(?, market_type),
          outcomes = COALESCE(?, outcomes),
          close_date = COALESCE(?, close_date),
          status = COALESCE(?, status),
          current_price = COALESCE(?, current_price),
          current_prices = COALESCE(?, current_prices),
          volume = COALESCE(?, volume),
          liquidity = COALESCE(?, liquidity),
          last_updated_at = CURRENT_TIMESTAMP
      WHERE polymarket_id = ?
    `).run(
      market.slug,
      market.event_slug,
      market.question,
      market.description,
      market.category,
      market.market_type,
      market.outcomes,
      market.close_date,
      market.status,
      market.current_price,
      market.current_prices,
      market.volume,
      market.liquidity,
      market.polymarket_id
    );

    return getMarketByPolymarketId(market.polymarket_id)!;
  } else {
    // Insert
    const id = generateId();

    db.prepare(`
      INSERT INTO markets (
        id, polymarket_id, slug, event_slug, question, description, category, market_type,
        outcomes, close_date, status, current_price, current_prices, volume, liquidity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      market.polymarket_id,
      market.slug,
      market.event_slug,
      market.question || '',
      market.description,
      market.category,
      market.market_type || 'binary',
      market.outcomes,
      market.close_date || new Date().toISOString(),
      market.status || 'active',
      market.current_price,
      market.current_prices,
      market.volume,
      market.liquidity
    );

    return getMarketById(id)!;
  }
}

/**
 * Update market resolution
 */
export function resolveMarket(id: string, outcome: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE markets
    SET status = 'resolved',
        resolution_outcome = ?,
        resolved_at = ?,
        last_updated_at = ?
    WHERE id = ?
  `).run(outcome, now, now, id);
}

/**
 * Get closed (unresolved) markets
 */
export function getClosedMarkets(): Market[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM markets
    WHERE status = 'closed'
    ORDER BY close_date DESC
  `).all() as Market[];
}

// ============================================================================
// POSITION QUERIES
// ============================================================================

/**
 * Get open positions for an agent
 * Only returns positions on active markets (markets still accepting trades)
 * Use this for displaying tradeable positions to users.
 */
export function getOpenPositions(agentId: string): Position[] {
  const db = getDb();
  return db.prepare(`
    SELECT p.* FROM positions p
    JOIN markets m ON p.market_id = m.id
    WHERE p.agent_id = ?
      AND p.status = 'open'
      AND m.status = 'active'
    ORDER BY p.opened_at DESC
  `).all(agentId) as Position[];
}

/**
 * Get ALL open positions for an agent (including those on closed/resolved markets)
 * Returns positions regardless of market status - used for valuation/accounting.
 * Use this for portfolio snapshots and P/L calculations.
 */
export function getAllOpenPositions(agentId: string): Position[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM positions
    WHERE agent_id = ? AND status = 'open'
    ORDER BY opened_at DESC
  `).all(agentId) as Position[];
}

/**
 * Check if a cohort has any open positions and has trading activity
 *
 * Optimized single query to replace N+1 pattern in isCohortComplete.
 *
 * @param cohortId - Cohort to check
 * @returns Object with open_positions count and total_decisions count
 */
export function getCohortCompletionStatus(cohortId: string): { open_positions: number; total_decisions: number } {
  const db = getDb();
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM positions p
       JOIN agents a ON p.agent_id = a.id
       WHERE a.cohort_id = ? AND p.status = 'open') as open_positions,
      (SELECT COUNT(*) FROM decisions d
       JOIN agents a ON d.agent_id = a.id
       WHERE a.cohort_id = ?) as total_decisions
  `).get(cohortId, cohortId) as { open_positions: number; total_decisions: number };
}

/**
 * Get positions with market info for an agent
 * Only returns positions on active markets (markets still accepting trades)
 */
export function getPositionsWithMarkets(agentId: string): PositionWithMarket[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      p.*,
      m.question as market_question,
      m.current_price,
      t.decision_id as opening_decision_id
    FROM positions p
    JOIN markets m ON p.market_id = m.id
    LEFT JOIN (
      SELECT market_id, agent_id, side, decision_id, MIN(executed_at) as first_trade
      FROM trades
      WHERE trade_type = 'BUY'
      GROUP BY market_id, agent_id, side
    ) t ON p.market_id = t.market_id AND p.agent_id = t.agent_id AND p.side = t.side
    WHERE p.agent_id = ?
      AND p.status = 'open'
      AND m.status = 'active'
    ORDER BY p.opened_at DESC
  `).all(agentId) as PositionWithMarket[];
}

/**
 * Get closed/settled positions with market info and outcomes for an agent
 * Returns positions that are either:
 * 1. Settled (market resolved) - shows win/loss/cancelled outcome
 * 2. Closed (manually exited before resolution) - shows realized P/L
 * 3. Open but market is closed (awaiting resolution) - shows pending status
 */
export function getClosedPositionsWithMarkets(agentId: string): any[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      p.id,
      p.market_id,
      p.side,
      p.shares,
      p.avg_entry_price,
      p.total_cost,
      p.status as position_status,
      p.opened_at,
      p.closed_at,
      m.question as market_question,
      m.status as market_status,
      m.resolution_outcome,
      m.resolved_at,
      -- Calculate outcome
      CASE
        -- Position manually closed (sold before resolution)
        WHEN p.status = 'closed' THEN 'EXITED'
        -- Position settled on resolved market
        WHEN p.status = 'settled' AND m.resolution_outcome = 'CANCELLED' THEN 'CANCELLED'
        WHEN p.status = 'settled' AND UPPER(p.side) = UPPER(m.resolution_outcome) THEN 'WON'
        WHEN p.status = 'settled' AND UPPER(p.side) != UPPER(m.resolution_outcome) THEN 'LOST'
        -- Position open but market closed (awaiting resolution)
        WHEN p.status = 'open' AND m.status = 'closed' THEN 'PENDING'
        ELSE 'UNKNOWN'
      END as outcome,
      -- Calculate settlement/exit value
      CASE
        WHEN p.status = 'closed' THEN (
          -- Sum of SELL trade proceeds for this position
          SELECT COALESCE(SUM(total_amount), 0)
          FROM trades
          WHERE position_id = p.id AND trade_type = 'SELL'
        )
        WHEN p.status = 'settled' AND UPPER(p.side) = UPPER(m.resolution_outcome) THEN p.shares * 1.0
        WHEN p.status = 'settled' THEN 0.0
        ELSE NULL
      END as settlement_value,
      -- Calculate P/L
      CASE
        WHEN p.status = 'closed' THEN (
          SELECT COALESCE(SUM(total_amount), 0) - p.total_cost
          FROM trades
          WHERE position_id = p.id AND trade_type = 'SELL'
        )
        WHEN p.status = 'settled' AND UPPER(p.side) = UPPER(m.resolution_outcome) THEN (p.shares * 1.0) - p.total_cost
        WHEN p.status = 'settled' THEN 0.0 - p.total_cost
        ELSE NULL
      END as pnl,
      -- Get opening decision
      t.decision_id as opening_decision_id
    FROM positions p
    JOIN markets m ON p.market_id = m.id
    LEFT JOIN (
      SELECT position_id, decision_id, MIN(executed_at) as first_trade
      FROM trades
      WHERE trade_type = 'BUY'
      GROUP BY position_id
    ) t ON p.id = t.position_id
    WHERE p.agent_id = ?
      AND (
        -- Settled positions (resolved markets)
        p.status = 'settled'
        -- OR manually closed positions (exited before resolution)
        OR p.status = 'closed'
        -- OR open positions on closed markets (awaiting resolution)
        OR (p.status = 'open' AND m.status IN ('closed', 'resolved'))
      )
    ORDER BY
      COALESCE(p.closed_at, m.resolved_at, m.close_date) DESC,
      p.opened_at DESC
    LIMIT 50
  `).all(agentId);
}

/**
 * Get a position by ID
 */
export function getPositionById(id: string): Position | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM positions WHERE id = ?').get(id) as Position | undefined;
}

/**
 * Get position by agent, market, and side
 */
export function getPosition(agentId: string, marketId: string, side: string): Position | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM positions
    WHERE agent_id = ? AND market_id = ? AND side = ? AND status = 'open'
  `).get(agentId, marketId, side) as Position | undefined;
}

/**
 * Create or update a position (after buying)
 */
export function upsertPosition(
  agentId: string,
  marketId: string,
  side: string,
  shares: number,
  price: number,
  cost: number
): Position {
  const db = getDb();
  const existing = getPosition(agentId, marketId, side);

  if (existing) {
    // Update existing position (average in)
    const newShares = existing.shares + shares;
    const newCost = existing.total_cost + cost;

    // Guard against division by zero
    if (newShares <= 0) {
      throw new Error(`Cannot calculate avg price: newShares is ${newShares}`);
    }
    const newAvgPrice = newCost / newShares;

    db.prepare(`
      UPDATE positions
      SET shares = ?, avg_entry_price = ?, total_cost = ?
      WHERE id = ?
    `).run(newShares, newAvgPrice, newCost, existing.id);

    return getPositionById(existing.id)!;
  } else {
    // Create new position
    const id = generateId();

    db.prepare(`
      INSERT INTO positions (id, agent_id, market_id, side, shares, avg_entry_price, total_cost, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
    `).run(id, agentId, marketId, side, shares, price, cost);

    return getPositionById(id)!;
  }
}

/**
 * Reduce a position (partial sell)
 */
export function reducePosition(id: string, sharesToSell: number): void {
  const db = getDb();
  const position = getPositionById(id);

  if (!position) return;

  // Guard against division by zero
  if (position.shares <= 0) {
    throw new Error(`Cannot reduce position ${id}: shares is ${position.shares}`);
  }

  const newShares = position.shares - sharesToSell;
  const costReduction = (sharesToSell / position.shares) * position.total_cost;
  const newCost = position.total_cost - costReduction;

  if (newShares <= 0) {
    // Close position completely
    db.prepare(`
      UPDATE positions
      SET shares = 0, total_cost = 0, current_value = 0, unrealized_pnl = 0, status = 'closed', closed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
  } else {
    // Reduce position
    db.prepare(`
      UPDATE positions
      SET shares = ?, total_cost = ?
      WHERE id = ?
    `).run(newShares, newCost, id);
  }
}

/**
 * Settle a position (market resolved)
 */
export function settlePosition(id: string): void {
  const db = getDb();

  db.prepare(`
    UPDATE positions
    SET current_value = 0, unrealized_pnl = 0, status = 'settled', closed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
}

/**
 * Get positions for a market
 */
export function getPositionsByMarket(marketId: string): Position[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM positions
    WHERE market_id = ? AND status = 'open'
  `).all(marketId) as Position[];
}

/**
 * Update position mark-to-market values
 */
export function updatePositionMTM(id: string, currentValue: number, unrealizedPnl: number): void {
  const db = getDb();

  db.prepare(`
    UPDATE positions
    SET current_value = ?, unrealized_pnl = ?
    WHERE id = ?
  `).run(currentValue, unrealizedPnl, id);
}

// ============================================================================
// TRADE QUERIES
// ============================================================================

/**
 * Record a new trade
 * 
 * For BUY trades: Set implied_confidence for Brier scoring
 * For SELL trades: Set cost_basis and realized_pnl for P/L tracking
 */
export function createTrade(trade: {
  agent_id: string;
  market_id: string;
  position_id?: string;
  decision_id?: string;
  trade_type: 'BUY' | 'SELL';
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  implied_confidence?: number; // BUY only
  cost_basis?: number;         // SELL only
  realized_pnl?: number;       // SELL only
}): Trade {
  const db = getDb();
  const id = generateId();

  db.prepare(`
    INSERT INTO trades (
      id, agent_id, market_id, position_id, decision_id,
      trade_type, side, shares, price, total_amount, 
      implied_confidence, cost_basis, realized_pnl
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    trade.agent_id,
    trade.market_id,
    trade.position_id,
    trade.decision_id,
    trade.trade_type,
    trade.side,
    trade.shares,
    trade.price,
    trade.total_amount,
    trade.implied_confidence,
    trade.cost_basis,
    trade.realized_pnl
  );

  return db.prepare('SELECT * FROM trades WHERE id = ?').get(id) as Trade;
}

/**
 * Get trades for an agent
 */
export function getTradesByAgent(agentId: string, limit?: number): Trade[] {
  const db = getDb();

  if (limit) {
    return db.prepare(`
      SELECT * FROM trades
      WHERE agent_id = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `).all(agentId, limit) as Trade[];
  }

  return db.prepare(`
    SELECT * FROM trades
    WHERE agent_id = ?
    ORDER BY executed_at DESC
  `).all(agentId) as Trade[];
}

/**
 * Get trades for a market
 */
export function getTradesByMarket(marketId: string): Trade[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM trades
    WHERE market_id = ?
    ORDER BY executed_at DESC
  `).all(marketId) as Trade[];
}

/**
 * Get trades for a decision
 */
export function getTradesByDecision(decisionId: string): Trade[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM trades
    WHERE decision_id = ?
    ORDER BY executed_at ASC
  `).all(decisionId) as Trade[];
}

// ============================================================================
// DECISION QUERIES
// ============================================================================

/**
 * Log a decision
 */
export function createDecision(decision: {
  agent_id: string;
  cohort_id: string;
  decision_week: number;
  prompt_system: string;
  prompt_user: string;
  raw_response?: string;
  parsed_response?: string;
  retry_count?: number;
  action: 'BET' | 'SELL' | 'HOLD' | 'ERROR';
  reasoning?: string;
  tokens_input?: number;
  tokens_output?: number;
  api_cost_usd?: number;
  response_time_ms?: number;
  error_message?: string;
}): Decision {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO decisions (
      id, agent_id, cohort_id, decision_week, decision_timestamp,
      prompt_system, prompt_user, raw_response, parsed_response, retry_count,
      action, reasoning, tokens_input, tokens_output, api_cost_usd,
      response_time_ms, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    decision.agent_id,
    decision.cohort_id,
    decision.decision_week,
    now,
    decision.prompt_system,
    decision.prompt_user,
    decision.raw_response,
    decision.parsed_response,
    decision.retry_count || 0,
    decision.action,
    decision.reasoning,
    decision.tokens_input,
    decision.tokens_output,
    decision.api_cost_usd,
    decision.response_time_ms,
    decision.error_message
  );

  return db.prepare('SELECT * FROM decisions WHERE id = ?').get(id) as Decision;
}

/**
 * Get decisions for an agent
 */
export function getDecisionsByAgent(agentId: string, limit?: number): Decision[] {
  const db = getDb();

  if (limit) {
    return db.prepare(`
      SELECT * FROM decisions
      WHERE agent_id = ?
      ORDER BY decision_timestamp DESC
      LIMIT ?
    `).all(agentId, limit) as Decision[];
  }

  return db.prepare(`
    SELECT * FROM decisions
    WHERE agent_id = ?
    ORDER BY decision_timestamp DESC
  `).all(agentId) as Decision[];
}

/**
 * Get recent decisions across all agents
 */
export function getRecentDecisions(limit: number = 20): Decision[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM decisions
    ORDER BY decision_timestamp DESC
    LIMIT ?
  `).all(limit) as Decision[];
}

/**
 * Get total number of decisions for a cohort
 */
export function getTotalDecisionsForCohort(cohortId: string): number {
  const db = getDb();
  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM decisions
    WHERE cohort_id = ?
  `).get(cohortId) as { count: number };
  return result.count;
}

// ============================================================================
// PORTFOLIO SNAPSHOT QUERIES
// ============================================================================

/**
 * Create a portfolio snapshot
 */
export function createPortfolioSnapshot(snapshot: {
  agent_id: string;
  snapshot_timestamp: string;
  cash_balance: number;
  positions_value: number;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  brier_score?: number;
  num_resolved_bets?: number;
}): PortfolioSnapshot {
  const db = getDb();
  const id = generateId();

  // Use upsert to handle duplicate dates
  db.prepare(`
    INSERT INTO portfolio_snapshots (
      id, agent_id, snapshot_timestamp, cash_balance, positions_value,
      total_value, total_pnl, total_pnl_percent, brier_score, num_resolved_bets
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_id, snapshot_timestamp) DO UPDATE SET
      cash_balance = excluded.cash_balance,
      positions_value = excluded.positions_value,
      total_value = excluded.total_value,
      total_pnl = excluded.total_pnl,
      total_pnl_percent = excluded.total_pnl_percent,
      brier_score = excluded.brier_score,
      num_resolved_bets = excluded.num_resolved_bets
  `).run(
    id,
    snapshot.agent_id,
    snapshot.snapshot_timestamp,
    snapshot.cash_balance,
    snapshot.positions_value,
    snapshot.total_value,
    snapshot.total_pnl,
    snapshot.total_pnl_percent,
    snapshot.brier_score,
    snapshot.num_resolved_bets || 0
  );

  return db.prepare(`
    SELECT * FROM portfolio_snapshots
    WHERE agent_id = ? AND snapshot_timestamp = ?
  `).get(snapshot.agent_id, snapshot.snapshot_timestamp) as PortfolioSnapshot;
}

/**
 * Get portfolio snapshots for an agent
 */
export function getSnapshotsByAgent(agentId: string, limit?: number): PortfolioSnapshot[] {
  const db = getDb();

  if (limit) {
    return db.prepare(`
      SELECT * FROM portfolio_snapshots
      WHERE agent_id = ?
      ORDER BY snapshot_timestamp DESC
      LIMIT ?
    `).all(agentId, limit) as PortfolioSnapshot[];
  }

  return db.prepare(`
    SELECT * FROM portfolio_snapshots
    WHERE agent_id = ?
    ORDER BY snapshot_timestamp ASC
  `).all(agentId) as PortfolioSnapshot[];
}

/**
 * Get latest snapshot for an agent
 */
export function getLatestSnapshot(agentId: string): PortfolioSnapshot | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM portfolio_snapshots
    WHERE agent_id = ?
    ORDER BY snapshot_timestamp DESC
    LIMIT 1
  `).get(agentId) as PortfolioSnapshot | undefined;
}

// ============================================================================
// BRIER SCORE QUERIES
// ============================================================================

/**
 * Record a Brier score
 */
export function createBrierScore(score: {
  agent_id: string;
  trade_id: string;
  market_id: string;
  forecast_probability: number;
  actual_outcome: number;
  brier_score: number;
}): BrierScoreRecord {
  const db = getDb();
  const id = generateId();

  db.prepare(`
    INSERT INTO brier_scores (
      id, agent_id, trade_id, market_id,
      forecast_probability, actual_outcome, brier_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    score.agent_id,
    score.trade_id,
    score.market_id,
    score.forecast_probability,
    score.actual_outcome,
    score.brier_score
  );

  return db.prepare('SELECT * FROM brier_scores WHERE id = ?').get(id) as BrierScoreRecord;
}

/**
 * Get Brier scores for an agent
 */
export function getBrierScoresByAgent(agentId: string): BrierScoreRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM brier_scores
    WHERE agent_id = ?
    ORDER BY calculated_at DESC
  `).all(agentId) as BrierScoreRecord[];
}

/**
 * Get average Brier score for an agent
 */
export function getAverageBrierScore(agentId: string): number | null {
  const db = getDb();
  const result = db.prepare(`
    SELECT AVG(brier_score) as avg_brier
    FROM brier_scores
    WHERE agent_id = ?
  `).get(agentId) as { avg_brier: number | null };

  return result.avg_brier;
}

// ============================================================================
// API COST QUERIES
// ============================================================================

/**
 * Record API cost
 */
export function createApiCost(cost: {
  model_id: string;
  decision_id?: string;
  tokens_input?: number;
  tokens_output?: number;
  cost_usd?: number;
}): ApiCost {
  const db = getDb();
  const id = generateId();

  db.prepare(`
    INSERT INTO api_costs (id, model_id, decision_id, tokens_input, tokens_output, cost_usd)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, cost.model_id, cost.decision_id, cost.tokens_input, cost.tokens_output, cost.cost_usd);

  return db.prepare('SELECT * FROM api_costs WHERE id = ?').get(id) as ApiCost;
}

/**
 * Get total costs by model
 */
export function getTotalCostsByModel(): Record<string, number> {
  const db = getDb();
  const results = db.prepare(`
    SELECT model_id, SUM(cost_usd) as total_cost
    FROM api_costs
    GROUP BY model_id
  `).all() as { model_id: string; total_cost: number }[];

  const costs: Record<string, number> = {};
  for (const r of results) {
    costs[r.model_id] = r.total_cost;
  }

  return costs;
}

// ============================================================================
// LEADERBOARD QUERIES
// ============================================================================

/**
 * Get aggregate leaderboard across all cohorts
 *
 * Optimized to use a single query with CTEs instead of N+1 pattern.
 */
export function getAggregateLeaderboard(): LeaderboardEntry[] {
  const db = getDb();

  // Single optimized query using CTEs to avoid N+1 pattern
  const results = db.prepare(`
    WITH latest_snapshots AS (
      -- Get latest snapshot per agent using window function
      SELECT
        ps.*,
        ROW_NUMBER() OVER (PARTITION BY ps.agent_id ORDER BY ps.snapshot_timestamp DESC) as rn
      FROM portfolio_snapshots ps
    ),
    agent_stats AS (
      -- Aggregate snapshot data by model
      SELECT
        a.model_id,
        COUNT(DISTINCT a.id) as num_cohorts,
        SUM(COALESCE(ls.total_pnl, 0)) as total_pnl,
        SUM(COALESCE(ls.num_resolved_bets, 0)) as total_resolved_bets
      FROM agents a
      LEFT JOIN latest_snapshots ls ON a.id = ls.agent_id AND ls.rn = 1
      GROUP BY a.model_id
    ),
    brier_stats AS (
      -- Calculate average Brier score by model
      SELECT
        a.model_id,
        AVG(bs.brier_score) as avg_brier_score
      FROM brier_scores bs
      JOIN agents a ON bs.agent_id = a.id
      GROUP BY a.model_id
    ),
    win_stats AS (
      -- Calculate win rate by model
      SELECT
        a.model_id,
        COUNT(CASE WHEN
          (t.side = 'YES' AND m.resolution_outcome = 'YES') OR
          (t.side = 'NO' AND m.resolution_outcome = 'NO') OR
          (t.side = m.resolution_outcome)
        THEN 1 END) as wins,
        COUNT(*) as total_bets
      FROM brier_scores bs
      JOIN agents a ON bs.agent_id = a.id
      JOIN trades t ON bs.trade_id = t.id
      JOIN markets m ON bs.market_id = m.id
      WHERE m.status = 'resolved'
      GROUP BY a.model_id
    )
    SELECT
      m.id as model_id,
      m.display_name,
      m.provider,
      m.color,
      COALESCE(s.total_pnl, 0) as total_pnl,
      CASE WHEN s.num_cohorts > 0
        THEN (COALESCE(s.total_pnl, 0) / (s.num_cohorts * ?)) * 100
        ELSE 0
      END as total_pnl_percent,
      b.avg_brier_score,
      COALESCE(s.num_cohorts, 0) as num_cohorts,
      COALESCE(s.total_resolved_bets, 0) as num_resolved_bets,
      CASE WHEN w.total_bets > 0
        THEN CAST(w.wins AS REAL) / w.total_bets
        ELSE NULL
      END as win_rate
    FROM models m
    LEFT JOIN agent_stats s ON m.id = s.model_id
    LEFT JOIN brier_stats b ON m.id = b.model_id
    LEFT JOIN win_stats w ON m.id = w.model_id
    WHERE m.is_active = 1 AND COALESCE(s.num_cohorts, 0) > 0
    ORDER BY total_pnl DESC
  `).all(INITIAL_BALANCE) as LeaderboardEntry[];

  return results;
}

/**
 * Get cohort summaries
 */
export function getCohortSummaries(): CohortSummary[] {
  const db = getDb();

  return db.prepare(`
    SELECT 
      c.id,
      c.cohort_number,
      c.started_at,
      c.status,
      c.methodology_version,
      COUNT(DISTINCT a.id) as num_agents,
      COUNT(DISTINCT t.market_id) as total_markets_traded
    FROM cohorts c
    LEFT JOIN agents a ON c.id = a.cohort_id
    LEFT JOIN trades t ON a.id = t.agent_id
    GROUP BY c.id
    ORDER BY c.started_at DESC
  `).all() as CohortSummary[];
}

// ============================================================================
// SYSTEM LOG QUERIES
// ============================================================================

/**
 * Get recent system logs
 */
export function getRecentLogs(limit: number = 100): SystemLog[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM system_logs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as SystemLog[];
}

/**
 * Get logs by severity
 */
export function getLogsBySeverity(severity: 'info' | 'warning' | 'error', limit: number = 100): SystemLog[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM system_logs
    WHERE severity = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(severity, limit) as SystemLog[];
}


