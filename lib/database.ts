/**
 * SQLite Database Layer for Forecaster Arena
 *
 * This module provides a complete database abstraction using better-sqlite3.
 * It handles:
 * - Automatic schema creation
 * - Initial data seeding (Season 1, 6 AI agents, sample market)
 * - Query helpers for all database operations
 * - Foreign key constraints
 * - Performance indexes
 *
 * The database auto-initializes on first import (server-side only).
 * Database file location: <project-root>/data/forecaster.db
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { callLLM, buildSystemPrompt, buildUserPrompt, LLMDecision } from './openrouter';

// Database file location - stored in data/ directory (gitignored)
const DB_PATH = path.join(process.cwd(), 'data', 'forecaster.db');

// Ensure data directory exists before creating database
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database connection
// verbose: () => null disables logging for cleaner output
const db = new Database(DB_PATH);

// Enable foreign key constraints (disabled by default in SQLite)
// This ensures referential integrity between tables
db.pragma('foreign_keys = ON');

/**
 * Initialize database schema and seed initial data if needed
 *
 * Creates all required tables:
 * - seasons: Competition seasons (90-day periods)
 * - agents: AI model agents (6 models per season)
 * - markets: Prediction markets from Polymarket
 * - bets: Agent betting records
 * - equity_snapshots: Historical performance tracking
 *
 * Also creates performance indexes for common queries.
 * Seeds data only if database is empty (idempotent).
 */
export function initializeDatabase() {
  console.log('🗄️  Initializing SQLite database...');

  // Create all tables with foreign key relationships
  db.exec(`
    -- ===== SEASONS TABLE =====
    -- Tracks competition seasons (typically 90 days each)
    CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,                              -- Unique season ID
      name TEXT NOT NULL,                               -- Display name (e.g., "Season 1")
      season_number INTEGER NOT NULL UNIQUE,            -- Sequential number
      start_date TEXT NOT NULL,                         -- ISO 8601 timestamp
      end_date TEXT NOT NULL,                           -- ISO 8601 timestamp
      status TEXT NOT NULL DEFAULT 'active',            -- active | completed | cancelled
      initial_bankroll REAL NOT NULL DEFAULT 1000.00,   -- Starting amount for each agent
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- ===== AGENTS TABLE =====
    -- AI model agents competing in prediction markets
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,                              -- Unique agent ID
      season_id TEXT NOT NULL,                          -- Links to seasons table
      model_id TEXT NOT NULL,                           -- OpenRouter model ID (e.g., 'openai/gpt-4')
      display_name TEXT NOT NULL,                       -- Human-readable name
      balance REAL NOT NULL DEFAULT 1000.00,            -- Current available funds
      total_pl REAL NOT NULL DEFAULT 0.00,              -- Total profit/loss
      total_bets INTEGER DEFAULT 0,                     -- Total bets placed
      winning_bets INTEGER DEFAULT 0,                   -- Number of winning bets
      losing_bets INTEGER DEFAULT 0,                    -- Number of losing bets
      pending_bets INTEGER DEFAULT 0,                   -- Number of active bets
      status TEXT NOT NULL DEFAULT 'active',            -- active | paused | eliminated
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (season_id) REFERENCES seasons(id),
      UNIQUE(season_id, model_id)                       -- One agent per model per season
    );

    -- ===== MARKETS TABLE =====
    -- Prediction markets (from Polymarket or manually created)
    CREATE TABLE IF NOT EXISTS markets (
      id TEXT PRIMARY KEY,                              -- Unique market ID
      polymarket_id TEXT UNIQUE,                        -- Polymarket market ID (nullable for custom markets)
      question TEXT NOT NULL,                           -- Market question
      description TEXT,                                 -- Detailed description
      category TEXT,                                    -- Category (e.g., 'crypto', 'politics')
      close_date TEXT NOT NULL,                         -- When market closes for betting
      resolution_date TEXT,                             -- When market resolves
      status TEXT NOT NULL DEFAULT 'active',            -- active | closed | resolved | cancelled
      current_price REAL,                               -- Current YES price (0-1)
      price_updated_at TEXT,                            -- When price was last updated
      winning_outcome TEXT,                             -- 'YES' or 'NO' after resolution
      volume REAL,                                      -- Total trading volume
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- ===== BETS TABLE =====
    -- Individual bets placed by agents
    CREATE TABLE IF NOT EXISTS bets (
      id TEXT PRIMARY KEY,                              -- Unique bet ID
      agent_id TEXT NOT NULL,                           -- Which agent placed this bet
      market_id TEXT NOT NULL,                          -- Which market
      side TEXT NOT NULL,                               -- 'YES' or 'NO'
      amount REAL NOT NULL,                             -- Bet amount in dollars
      price REAL NOT NULL,                              -- Price at time of bet (0-1)
      confidence REAL,                                  -- AI confidence score (0-1)
      reasoning TEXT,                                   -- AI reasoning for the bet
      raw_response TEXT,                                -- Full LLM response (for debugging)
      status TEXT NOT NULL DEFAULT 'pending',           -- pending | won | lost | sold | cancelled | refunded
      pnl REAL,                                         -- Profit/loss after resolution
      polymarket_order_id TEXT,                         -- Polymarket order ID (if placed on-chain)
      placed_at TEXT DEFAULT CURRENT_TIMESTAMP,         -- When bet was placed
      resolved_at TEXT,                                 -- When bet was resolved
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (market_id) REFERENCES markets(id)
    );

    -- ===== EQUITY SNAPSHOTS TABLE =====
    -- Historical performance tracking for charts
    CREATE TABLE IF NOT EXISTS equity_snapshots (
      id TEXT PRIMARY KEY,                              -- Unique snapshot ID
      agent_id TEXT NOT NULL,                           -- Which agent
      balance REAL NOT NULL,                            -- Balance at this point in time
      total_pl REAL NOT NULL,                           -- Total P/L at this point in time
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,         -- When snapshot was taken
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    -- ===== MARKET SYNC LOG TABLE =====
    -- Audit log for market price sync operations
    CREATE TABLE IF NOT EXISTS market_sync_log (
      id TEXT PRIMARY KEY,                              -- Unique log ID
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP,         -- When sync occurred
      markets_added INTEGER NOT NULL DEFAULT 0,         -- Number of new markets added
      markets_updated INTEGER NOT NULL DEFAULT 0,       -- Number of markets updated
      errors TEXT                                       -- Any errors encountered
    );

    -- ===== AGENT DECISIONS TABLE =====
    -- Log of all AI decision-making for analysis
    CREATE TABLE IF NOT EXISTS agent_decisions (
      id TEXT PRIMARY KEY,                              -- Unique decision ID
      agent_id TEXT NOT NULL,                           -- Which agent made the decision
      decision_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,-- When decision was made
      action TEXT NOT NULL,                             -- BET | SELL | HOLD
      raw_llm_response TEXT,                            -- Full LLM response
      reasoning TEXT,                                   -- AI reasoning
      confidence REAL,                                  -- Confidence score if applicable
      bets_to_sell TEXT,                                -- JSON array of bet IDs to sell
      market_id TEXT,                                   -- Market ID if BET action
      side TEXT,                                        -- YES or NO if BET action
      amount REAL,                                      -- Bet amount if BET action
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    -- ===== PERFORMANCE INDEXES =====
    -- Optimize common query patterns
    CREATE INDEX IF NOT EXISTS idx_agents_season ON agents(season_id);
    CREATE INDEX IF NOT EXISTS idx_agents_balance ON agents(balance DESC);        -- For leaderboard
    CREATE INDEX IF NOT EXISTS idx_bets_agent ON bets(agent_id, placed_at DESC); -- For bet history
    CREATE INDEX IF NOT EXISTS idx_bets_market ON bets(market_id);
    CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);                  -- For pending bets
    CREATE INDEX IF NOT EXISTS idx_bets_resolved_at ON bets(resolved_at DESC) WHERE resolved_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_snapshots_agent_time ON equity_snapshots(agent_id, timestamp DESC); -- For charts
    CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON equity_snapshots(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_markets_status_updated ON markets(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_markets_price_updated ON markets(price_updated_at DESC) WHERE price_updated_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_decisions_agent_time ON agent_decisions(agent_id, decision_timestamp DESC);
  `);

  // Check if we need to seed initial data
  const seasonCount = db.prepare('SELECT COUNT(*) as count FROM seasons').get() as { count: number };

  if (seasonCount.count === 0) {
    console.log('📊 Seeding initial data...');
    seedInitialData();
  }

  console.log('✅ Database initialized!');
}

/**
 * Seed initial data for a fresh database
 *
 * Creates:
 * - Season 1 (90-day season)
 * - 6 AI agents (GPT-4, Claude, Gemini, Llama, Mistral, DeepSeek)
 * - 1 sample prediction market
 *
 * Each agent starts with $1,000.
 */
function seedInitialData() {
  const seasonId = generateId();
  const now = new Date().toISOString();
  const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days from now

  // Insert Season 1
  db.prepare(`
    INSERT INTO seasons (id, name, season_number, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(seasonId, 'Season 1', 1, now, endDate, 'active');

  // Insert 6 AI agents using OpenRouter model IDs
  const agents = [
    ['openai/gpt-4', 'GPT-4'],
    ['anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet'],
    ['google/gemini-pro-1.5', 'Gemini Pro 1.5'],
    ['meta-llama/llama-3.1-70b-instruct', 'Llama 3.1 70B'],
    ['mistralai/mistral-large', 'Mistral Large'],
    ['deepseek/deepseek-chat', 'DeepSeek Chat']
  ];

  const insertAgent = db.prepare(`
    INSERT INTO agents (id, season_id, model_id, display_name)
    VALUES (?, ?, ?, ?)
  `);

  agents.forEach(([modelId, displayName]) => {
    insertAgent.run(generateId(), seasonId, modelId, displayName);
  });

  // Insert sample prediction market
  db.prepare(`
    INSERT INTO markets (id, polymarket_id, question, category, close_date, status, current_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    generateId(),
    'sample-btc-market',
    'Will Bitcoin be above $100,000 by end of 2024?',
    'crypto',
    '2024-12-31T23:59:59Z',
    'active',
    0.45  // 45% probability
  );

  console.log('✅ Seeded Season 1 with 6 agents and 1 sample market');
}

/**
 * Generate a unique ID for database records
 * Format: timestamp-random (e.g., "1699123456789-abc123def")
 *
 * @returns Unique identifier string
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Export database instance for direct access if needed
export default db;

/**
 * Query Helpers
 *
 * Pre-built queries for common database operations.
 * All queries are synchronous (SQLite is fast enough).
 */
export const queries = {
  // ===== AGENT QUERIES =====

  /**
   * Get all active agents for the current season
   * @returns Array of agent records
   */
  getActiveAgents: () => {
    return db.prepare(`
      SELECT * FROM agents
      WHERE status = 'active'
      ORDER BY display_name
    `).all();
  },

  /**
   * Get a specific agent by ID
   * @param id - Agent ID
   * @returns Agent record or undefined
   */
  getAgentById: (id: string) => {
    return db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  },

  /**
   * Update agent's balance and bet counts
   * @param id - Agent ID
   * @param balance - New balance
   * @param totalBets - New total bet count
   * @param pendingBets - New pending bet count
   */
  updateAgentBalance: (id: string, balance: number, totalBets: number, pendingBets: number) => {
    return db.prepare(`
      UPDATE agents
      SET balance = ?, total_bets = ?, pending_bets = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(balance, totalBets, pendingBets, id);
  },

  // ===== MARKET QUERIES =====

  /**
   * Get all active markets that haven't closed yet
   * @returns Array of market records
   */
  getActiveMarkets: () => {
    return db.prepare(`
      SELECT * FROM markets
      WHERE status = 'active' AND close_date > datetime('now')
      ORDER BY close_date
    `).all();
  },

  /**
   * Get closed markets (ready for resolution)
   * @returns Array of closed market records
   */
  getClosedMarkets: () => {
    return db.prepare(`
      SELECT * FROM markets
      WHERE status = 'closed'
      ORDER BY close_date DESC
    `).all();
  },

  /**
   * Get all markets regardless of status
   * @returns Array of all market records
   */
  getAllMarkets: () => {
    return db.prepare(`
      SELECT * FROM markets
      ORDER BY
        CASE status
          WHEN 'active' THEN 1
          WHEN 'closed' THEN 2
          WHEN 'resolved' THEN 3
          ELSE 4
        END,
        close_date DESC
    `).all();
  },

  /**
   * Get a specific market by ID
   * @param id - Market ID
   * @returns Market record or undefined
   */
  getMarketById: (id: string) => {
    return db.prepare('SELECT * FROM markets WHERE id = ?').get(id);
  },

  // ===== BET QUERIES =====

  /**
   * Insert a new bet into the database
   * @param bet - Bet object with required fields
   */
  insertBet: (bet: {
    id: string;
    agent_id: string;
    market_id: string;
    side: string;
    amount: number;
    price: number;
    confidence?: number;
    reasoning?: string;
    raw_response?: string;
  }) => {
    return db.prepare(`
      INSERT INTO bets (id, agent_id, market_id, side, amount, price, confidence, reasoning, raw_response, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      bet.id,
      bet.agent_id,
      bet.market_id,
      bet.side,
      bet.amount,
      bet.price,
      bet.confidence || null,
      bet.reasoning || null,
      bet.raw_response || null
    );
  },

  /**
   * Get recent bets with agent and market info joined
   * @param limit - Number of bets to return (default: 10)
   * @returns Array of bet records with agent_name and market_question
   */
  getRecentBets: (limit: number = 10) => {
    return db.prepare(`
      SELECT
        b.*,
        a.display_name as agent_name,
        m.question as market_question
      FROM bets b
      JOIN agents a ON b.agent_id = a.id
      JOIN markets m ON b.market_id = m.id
      ORDER BY b.placed_at DESC
      LIMIT ?
    `).all(limit);
  },

  /**
   * Get all bets for a specific agent
   * @param agentId - Agent ID
   * @param limit - Optional limit on number of results
   * @returns Array of bet records
   */
  getBetsByAgent: (agentId: string, limit?: number) => {
    if (limit) {
      return db.prepare(`
        SELECT * FROM bets
        WHERE agent_id = ?
        ORDER BY placed_at DESC
        LIMIT ?
      `).all(agentId, limit);
    }
    return db.prepare(`
      SELECT * FROM bets
      WHERE agent_id = ?
      ORDER BY placed_at DESC
    `).all(agentId);
  },

  /**
   * Get all bets for a specific market
   * @param marketId - Market ID
   * @returns Array of bet records
   */
  getBetsByMarket: (marketId: string) => {
    return db.prepare(`
      SELECT * FROM bets
      WHERE market_id = ?
      ORDER BY placed_at DESC
    `).all(marketId);
  },

  // ===== EQUITY SNAPSHOT QUERIES =====

  /**
   * Insert a new equity snapshot for performance tracking
   * @param agentId - Agent ID
   * @param balance - Current balance
   * @param totalPl - Current total P/L
   */
  insertSnapshot: (agentId: string, balance: number, totalPl: number) => {
    return db.prepare(`
      INSERT INTO equity_snapshots (id, agent_id, balance, total_pl)
      VALUES (?, ?, ?, ?)
    `).run(generateId(), agentId, balance, totalPl);
  },

  /**
   * Get equity snapshots for a specific agent
   * @param agentId - Agent ID
   * @param limit - Number of snapshots to return (default: 100)
   * @returns Array of snapshot records
   */
  getSnapshotsByAgent: (agentId: string, limit: number = 100) => {
    return db.prepare(`
      SELECT * FROM equity_snapshots
      WHERE agent_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(agentId, limit);
  },

  // ===== MARK-TO-MARKET CALCULATIONS =====

  /**
   * Calculate mark-to-market P/L for an agent's pending bets
   *
   * CRITICAL: Only includes bets on ACTIVE markets. Closed markets are excluded
   * because their prices are stale and will be settled when the market resolves.
   *
   * @param agentId - Agent ID
   * @returns Unrealized P/L from pending bets on active markets only
   */
  getMarkToMarketPL: (agentId: string): number => {
    const pendingBets = db.prepare(`
      SELECT b.id, b.amount, b.price, b.side, m.current_price
      FROM bets b
      JOIN markets m ON b.market_id = m.id
      WHERE b.agent_id = ?
        AND b.status = 'pending'
        AND m.status = 'active'
    `).all(agentId) as Array<{
      id: string;
      amount: number;
      price: number;
      side: string;
      current_price: number;
    }>;

    let totalUnrealizedPL = 0;

    for (const bet of pendingBets) {
      if (!bet.current_price) continue; // Skip if no current price

      let currentValue = 0;

      if (bet.side === 'YES') {
        // YES bet: shares = amount / entry_price, value = shares * current_price
        const shares = bet.amount / bet.price;
        currentValue = shares * bet.current_price;
      } else {
        // NO bet: shares = amount / (1 - entry_price), value = shares * (1 - current_price)
        const shares = bet.amount / (1 - bet.price);
        currentValue = shares * (1 - bet.current_price);
      }

      const unrealizedPL = currentValue - bet.amount;
      totalUnrealizedPL += unrealizedPL;
    }

    return totalUnrealizedPL;
  },

  /**
   * Get agent with mark-to-market P/L included
   * @param agentId - Agent ID
   * @returns Agent with mtm_pl field added
   */
  getAgentWithMTM: (agentId: string) => {
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as any;
    if (!agent) return null;

    const mtmPL = queries.getMarkToMarketPL(agentId);
    return {
      ...agent,
      mtm_pl: mtmPL,
      total_pl_with_mtm: agent.total_pl + mtmPL
    };
  },

  /**
   * Get all active agents with mark-to-market P/L
   * @returns Array of agents with mtm_pl field
   */
  getActiveAgentsWithMTM: () => {
    const agents = db.prepare('SELECT * FROM agents WHERE status = \'active\'').all() as any[];
    return agents.map(agent => {
      const mtmPL = queries.getMarkToMarketPL(agent.id);
      return {
        ...agent,
        mtm_pl: mtmPL,
        total_pl_with_mtm: agent.total_pl + mtmPL
      };
    });
  },

  // ===== STATISTICS QUERIES =====

  /**
   * Get overall statistics for dashboard
   * @returns Object with totalValue, totalPL, activeBets, activeMarkets
   */
  getStats: () => {
    const agents = db.prepare('SELECT balance, total_pl FROM agents WHERE status = \'active\'').all() as Array<{balance: number, total_pl: number}>;
    const activeBets = db.prepare('SELECT COUNT(*) as count FROM bets WHERE status = \'pending\'').get() as { count: number };
    const activeMarkets = db.prepare('SELECT COUNT(*) as count FROM markets WHERE status = \'active\'').get() as { count: number };

    // Calculate total portfolio value and P/L across all agents
    const totalValue = agents.reduce((sum, a) => sum + a.balance, 0);
    const totalPL = agents.reduce((sum, a) => sum + a.total_pl, 0);

    return {
      totalValue,
      totalPL,
      activeBets: activeBets.count,
      activeMarkets: activeMarkets.count
    };
  }
};

// ===== AGENT OPERATIONS =====
// Advanced agent operations including LLM decisions, bet execution, and market resolution

/**
 * Get agent's pending bets with mark-to-market information
 *
 * Returns ALL pending bets (including those on closed markets awaiting resolution).
 * MTM is only calculated for bets on ACTIVE markets (closed markets have stale prices).
 */
export function getAgentPendingBetsWithMTM(agentId: string): any[] {
  const bets = db.prepare(`
    SELECT
      b.id as bet_id,
      b.amount as bet_amount,
      b.price as entry_price,
      b.side,
      m.id as market_id,
      m.question as market_question,
      m.current_price,
      m.status as market_status,
      m.close_date
    FROM bets b
    JOIN markets m ON b.market_id = m.id
    WHERE b.agent_id = ? AND b.status = 'pending'
    ORDER BY b.placed_at DESC
  `).all(agentId) as any[];

  return bets.map(bet => {
    let currentValue = 0;
    let mtm_pnl = 0;

    // Only calculate MTM for ACTIVE markets (closed markets have stale prices)
    if (bet.market_status === 'active' && bet.current_price && bet.entry_price) {
      if (bet.side === 'YES') {
        const shares = bet.bet_amount / bet.entry_price;
        currentValue = shares * bet.current_price;
      } else {
        const shares = bet.bet_amount / (1 - bet.entry_price);
        currentValue = shares * (1 - bet.current_price);
      }
      mtm_pnl = currentValue - bet.bet_amount;
    } else if (bet.market_status === 'closed') {
      // For closed markets, value = stake (awaiting resolution)
      currentValue = bet.bet_amount;
      mtm_pnl = 0;  // No unrealized P/L - will be settled on resolution
    }

    return {
      ...bet,
      current_value: currentValue,
      mtm_pnl
    };
  });
}

/**
 * Get agent's decision for current markets using LLM
 */
export async function getAgentDecision(
  agent: any,
  markets: any[]
): Promise<LLMDecision & { agentId: string }> {
  console.log(`[${agent.display_name}] Analyzing ${markets.length} markets...`);

  // Get agent's pending bets with MTM info
  const pendingBets = getAgentPendingBetsWithMTM(agent.id);
  console.log(`[${agent.display_name}] Has ${pendingBets.length} pending bets`);

  const systemPrompt = buildSystemPrompt(agent.display_name);
  const userPrompt = buildUserPrompt(agent.balance, agent.total_bets, markets, pendingBets);

  const decision = await callLLM(agent.model_id, systemPrompt, userPrompt);

  console.log(`[${agent.display_name}] Decision: ${decision.action}`,
    decision.action === 'BET' ? `- ${decision.side} on market ${decision.marketId}` :
    decision.action === 'SELL' ? `- Selling ${decision.betsToSell?.length || 0} bet(s)` : '');

  // CRITICAL: Log decision to agent_decisions table for audit trail
  try {
    db.prepare(`
      INSERT INTO agent_decisions (
        id, agent_id, action, market_id, side, amount, confidence,
        bets_to_sell, reasoning, raw_llm_response, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      generateId(),
      agent.id,
      decision.action,
      decision.marketId || null,
      decision.side || null,
      decision.amount || null,
      decision.confidence || null,
      decision.betsToSell ? JSON.stringify(decision.betsToSell) : null,
      decision.reasoning || null,
      JSON.stringify(decision) // Store full decision as JSON
    );
  } catch (error) {
    // Log error but don't fail the decision - audit trail is important but not critical
    console.error(`[${agent.display_name}] ⚠️ Failed to log decision to database:`, error);
  }

  return {
    ...decision,
    agentId: agent.id
  };
}

/**
 * Execute a bet (record in DB, update balance)
 */
export async function executeBet(
  agent: any,
  decision: LLMDecision,
  market: any
): Promise<any | null> {
  if (decision.action !== 'BET' || !decision.marketId || !decision.side || !decision.amount) {
    return null;
  }

  // CRITICAL: Validate market is still open for betting
  const now = new Date().toISOString();
  if (market.close_date && market.close_date <= now) {
    console.warn(`[${agent.display_name}] Market already closed at ${market.close_date}`);
    return null;
  }

  if (market.status !== 'active') {
    console.warn(`[${agent.display_name}] Market not active (status: ${market.status})`);
    return null;
  }

  // Amount validation
  if (decision.amount > agent.balance) {
    console.warn(`[${agent.display_name}] Insufficient funds: ${decision.amount} > ${agent.balance}`);
    return null;
  }

  if (decision.amount < 10) {
    console.warn(`[${agent.display_name}] Bet too small: $${decision.amount}`);
    return null;
  }

  if (decision.amount > agent.balance * 0.3) {
    console.warn(`[${agent.display_name}] Bet too large (>30% of balance), capping`);
    decision.amount = Math.floor(agent.balance * 0.3);
  }

  // CRITICAL: Wrap in transaction to prevent partial bet execution
  // If insertBet succeeds but updateAgentBalance fails, we'd have a bet without debiting the agent
  db.prepare('BEGIN').run();

  try {
    const betId = `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert bet record
    queries.insertBet({
      id: betId,
      agent_id: agent.id,
      market_id: market.id,
      side: decision.side,
      amount: decision.amount,
      price: market.current_price || 0.5,
      confidence: decision.confidence,
      reasoning: decision.reasoning
    });

    // Update agent balance and stats
    queries.updateAgentBalance(
      agent.id,
      agent.balance - decision.amount,
      agent.total_bets + 1,
      agent.pending_bets + 1
    );

    // Commit transaction
    db.prepare('COMMIT').run();

    console.log(`[${agent.display_name}] ✓ Paper bet placed: $${decision.amount} ${decision.side} on "${market.question}"`);
    console.log(`   Price at entry: ${(market.current_price * 100).toFixed(1)}% | Confidence: ${decision.confidence || 'N/A'}`);

    return { id: betId };
  } catch (error) {
    // Rollback on error to maintain data integrity
    db.prepare('ROLLBACK').run();
    console.error(`[${agent.display_name}] Failed to execute bet, rolled back:`, error);
    return null;
  }
}

/**
 * Sell bets (realize MTM P/L and return cash to balance)
 * Wrapped in transaction for atomicity
 */
export async function sellBets(
  agent: any,
  betIds: string[]
): Promise<{ sold: number; totalPL: number }> {
  if (!betIds || betIds.length === 0) {
    return { sold: 0, totalPL: 0 };
  }

  let soldCount = 0;
  let totalPL = 0;

  // Start transaction
  db.prepare('BEGIN').run();

  try {
    for (const betId of betIds) {
      // Get bet with current market price
      const bet = db.prepare(`
        SELECT b.*, m.current_price
        FROM bets b
        JOIN markets m ON b.market_id = m.id
        WHERE b.id = ? AND b.agent_id = ? AND b.status = 'pending'
      `).get(betId, agent.id) as any;

      if (!bet) {
        console.warn(`[${agent.display_name}] Bet ${betId} not found or already closed`);
        continue;
      }

      // Calculate current value using MTM
      let currentValue = 0;
      if (bet.current_price && bet.price) {
        if (bet.side === 'YES') {
          const shares = bet.amount / bet.price;
          currentValue = shares * bet.current_price;
        } else {
          const shares = bet.amount / (1 - bet.price);
          currentValue = shares * (1 - bet.current_price);
        }
      }

      const pnl = currentValue - bet.amount;

      // Update bet status to "sold"
      db.prepare(`
        UPDATE bets
        SET status = 'sold', pnl = ?, resolved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(pnl, betId);

      // Return current value to agent's balance and update stats
      const newBalance = agent.balance + currentValue;
      const newTotalPL = agent.total_pl + pnl;

      // Determine if this was a winning or losing bet for stats
      const winCount = pnl > 0 ? agent.winning_bets + 1 : agent.winning_bets;
      const loseCount = pnl < 0 ? agent.losing_bets + 1 : agent.losing_bets;

      db.prepare(`
        UPDATE agents
        SET
          balance = ?,
          total_pl = ?,
          winning_bets = ?,
          losing_bets = ?,
          pending_bets = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        newBalance,
        newTotalPL,
        winCount,
        loseCount,
        agent.pending_bets - 1,
        agent.id
      );

      // Update agent object for next iteration
      agent.balance = newBalance;
      agent.total_pl = newTotalPL;
      agent.winning_bets = winCount;
      agent.losing_bets = loseCount;
      agent.pending_bets = agent.pending_bets - 1;

      soldCount++;
      totalPL += pnl;

      console.log(`[${agent.display_name}] ✓ Sold bet: ${bet.side} on market, P/L: $${pnl.toFixed(2)}`);
    }

    // Commit transaction
    db.prepare('COMMIT').run();

    if (soldCount > 0) {
      console.log(`[${agent.display_name}] ✓ Sold ${soldCount} bet(s), Total P/L: $${totalPL.toFixed(2)}`);
    }

    return { sold: soldCount, totalPL };
  } catch (error) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    console.error(`[${agent.display_name}] Transaction failed, rolled back:`, error);
    throw error;
  }
}

/**
 * Take equity snapshot for all agents
 */
export function takeEquitySnapshots(): void {
  const agents = queries.getActiveAgents();

  agents.forEach((agent: any) => {
    queries.insertSnapshot(agent.id, agent.balance, agent.total_pl);
  });

  console.log(`✓ Equity snapshots saved for ${agents.length} agents`);
}

/**
 * Get active markets (not closed or resolved)
 */
export function getActiveMarkets(): any[] {
  return queries.getActiveMarkets();
}

/**
 * Get all active agents
 */
export function getActiveAgents(): any[] {
  return queries.getActiveAgents();
}

/**
 * Update market price and timestamp
 * CRITICAL: This function is essential for accurate mark-to-market calculations
 * Should be called whenever market prices are synced from Polymarket
 *
 * @param marketId - The market ID to update
 * @param price - The new price (0-1)
 * @param volume - Optional: The new volume
 */
export function updateMarketPrice(
  marketId: string,
  price: number,
  volume?: number
): void {
  try {
    if (volume !== undefined) {
      db.prepare(`
        UPDATE markets
        SET current_price = ?, volume = ?, price_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(price, volume, marketId);
    } else {
      db.prepare(`
        UPDATE markets
        SET current_price = ?, price_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(price, marketId);
    }
  } catch (error) {
    console.error(`✗ Failed to update market price for ${marketId}:`, error);
    throw error;
  }
}

/**
 * Update multiple market prices in a transaction (for bulk syncing)
 * More efficient than calling updateMarketPrice() multiple times
 *
 * @param updates - Array of {marketId, price, volume?}
 */
export function updateMarketPrices(
  updates: Array<{ marketId: string; price: number; volume?: number }>
): void {
  if (!updates || updates.length === 0) {
    return;
  }

  db.prepare('BEGIN').run();

  try {
    const updateWithVolume = db.prepare(`
      UPDATE markets
      SET current_price = ?, volume = ?, price_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const updateWithoutVolume = db.prepare(`
      UPDATE markets
      SET current_price = ?, price_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    for (const update of updates) {
      if (update.volume !== undefined) {
        updateWithVolume.run(update.price, update.volume, update.marketId);
      } else {
        updateWithoutVolume.run(update.price, update.marketId);
      }
    }

    db.prepare('COMMIT').run();
    console.log(`✓ Updated prices for ${updates.length} markets`);
  } catch (error) {
    db.prepare('ROLLBACK').run();
    console.error(`✗ Failed to update market prices, rolled back:`, error);
    throw error;
  }
}

/**
 * Resolve a market and update all related bets
 */
export function resolveMarket(
  marketId: string,
  winningOutcome: 'YES' | 'NO'
): void {
  // CRITICAL: Wrap in transaction to prevent partial resolution if any operation fails
  db.prepare('BEGIN').run();

  try {
    // Get all pending bets for this market
    const bets = db.prepare('SELECT * FROM bets WHERE market_id = ? AND status = ?')
      .all(marketId, 'pending');

    bets.forEach((bet: any) => {
      const won = bet.side === winningOutcome;
      const pnl = won ? bet.amount : -bet.amount; // Simple 1:1 payout

      // Update bet
      db.prepare(`
        UPDATE bets
        SET status = ?, pnl = ?, resolved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(won ? 'won' : 'lost', pnl, bet.id);

      // Update agent stats
      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(bet.agent_id) as any;

      if (agent) {
        db.prepare(`
          UPDATE agents
          SET
            balance = ?,
            total_pl = ?,
            winning_bets = ?,
            losing_bets = ?,
            pending_bets = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          won ? agent.balance + bet.amount * 2 : agent.balance,
          agent.total_pl + pnl,
          won ? agent.winning_bets + 1 : agent.winning_bets,
          won ? agent.losing_bets : agent.losing_bets + 1,
          agent.pending_bets - 1,
          agent.id
        );
      }
    });

    // Update market status
    db.prepare(`
      UPDATE markets
      SET status = ?, winning_outcome = ?, resolution_date = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run('resolved', winningOutcome, marketId);

    // Commit transaction
    db.prepare('COMMIT').run();

    console.log(`✓ Market resolved: ${winningOutcome} wins (${bets.length} bets settled)`);
  } catch (error) {
    // Rollback on error to maintain database consistency
    db.prepare('ROLLBACK').run();
    console.error(`✗ Market resolution failed, rolled back:`, error);
    throw error;
  }
}

// ===== MARKET SYNC LOG OPERATIONS =====
// Track and audit market synchronization operations

/**
 * Log a market sync operation to the database
 *
 * @param marketsCount - Total number of markets processed
 * @param newMarkets - Number of new markets added
 * @param updatedMarkets - Number of existing markets updated
 * @param success - Whether the sync operation was successful
 * @param errorMessage - Optional error message if sync failed
 */
export function logMarketSync(
  marketsCount: number,
  newMarkets: number,
  updatedMarkets: number,
  success: boolean,
  errorMessage?: string
): void {
  const logId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    db.prepare(`
      INSERT INTO market_sync_log (id, markets_added, markets_updated, errors)
      VALUES (?, ?, ?, ?)
    `).run(logId, newMarkets, updatedMarkets, errorMessage || null);

    console.log(`✓ Sync logged: ${newMarkets} new, ${updatedMarkets} updated${!success ? ' (failed)' : ''}`);
  } catch (error) {
    console.error('Failed to log market sync:', error);
    // Don't throw - logging failures shouldn't break the sync operation
  }
}

/**
 * Get recent market sync logs
 *
 * @param limit - Number of logs to retrieve (default: 10)
 * @returns Array of sync log records, most recent first
 */
export function getRecentSyncLogs(limit: number = 10): any[] {
  return db.prepare(`
    SELECT * FROM market_sync_log
    ORDER BY synced_at DESC
    LIMIT ?
  `).all(limit);
}

/**
 * Get market sync statistics for a specified time period
 *
 * @param days - Number of days to look back (default: 7)
 * @returns Statistics object with sync counts and totals
 */
export function getSyncStats(days: number = 7): {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalMarketsAdded: number;
  totalMarketsUpdated: number;
} {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString();

  const stats = db.prepare(`
    SELECT
      COUNT(*) as totalSyncs,
      SUM(CASE WHEN errors IS NULL THEN 1 ELSE 0 END) as successfulSyncs,
      SUM(CASE WHEN errors IS NOT NULL THEN 1 ELSE 0 END) as failedSyncs,
      SUM(markets_added) as totalMarketsAdded,
      SUM(markets_updated) as totalMarketsUpdated
    FROM market_sync_log
    WHERE synced_at >= ?
  `).get(cutoff) as any;

  return {
    totalSyncs: stats.totalSyncs || 0,
    successfulSyncs: stats.successfulSyncs || 0,
    failedSyncs: stats.failedSyncs || 0,
    totalMarketsAdded: stats.totalMarketsAdded || 0,
    totalMarketsUpdated: stats.totalMarketsUpdated || 0
  };
}

// Auto-initialize database when module is imported (server-side only)
// This ensures database is ready before any queries are made
if (typeof window === 'undefined') {
  // Only initialize on server side (not in browser)
  initializeDatabase();
}
