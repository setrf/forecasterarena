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
      status TEXT NOT NULL DEFAULT 'pending',           -- pending | won | lost | cancelled | refunded
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

    -- ===== PERFORMANCE INDEXES =====
    -- Optimize common query patterns
    CREATE INDEX IF NOT EXISTS idx_agents_season ON agents(season_id);
    CREATE INDEX IF NOT EXISTS idx_agents_balance ON agents(balance DESC);        -- For leaderboard
    CREATE INDEX IF NOT EXISTS idx_bets_agent ON bets(agent_id, placed_at DESC); -- For bet history
    CREATE INDEX IF NOT EXISTS idx_bets_market ON bets(market_id);
    CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);                  -- For pending bets
    CREATE INDEX IF NOT EXISTS idx_snapshots_agent_time ON equity_snapshots(agent_id, timestamp DESC); -- For charts
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
   * @returns Array of bet records
   */
  getBetsByAgent: (agentId: string) => {
    return db.prepare(`
      SELECT * FROM bets
      WHERE agent_id = ?
      ORDER BY placed_at DESC
    `).all(agentId);
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

// Auto-initialize database when module is imported (server-side only)
// This ensures database is ready before any queries are made
if (typeof window === 'undefined') {
  // Only initialize on server side (not in browser)
  initializeDatabase();
}
