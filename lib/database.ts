import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database file location
const DB_PATH = path.join(process.cwd(), 'data', 'forecaster.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
export function initializeDatabase() {
  console.log('🗄️  Initializing SQLite database...');

  // Create tables
  db.exec(`
    -- Seasons table
    CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      season_number INTEGER NOT NULL UNIQUE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      initial_bankroll REAL NOT NULL DEFAULT 1000.00,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Agents table
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 1000.00,
      total_pl REAL NOT NULL DEFAULT 0.00,
      total_bets INTEGER DEFAULT 0,
      winning_bets INTEGER DEFAULT 0,
      losing_bets INTEGER DEFAULT 0,
      pending_bets INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (season_id) REFERENCES seasons(id),
      UNIQUE(season_id, model_id)
    );

    -- Markets table
    CREATE TABLE IF NOT EXISTS markets (
      id TEXT PRIMARY KEY,
      polymarket_id TEXT UNIQUE,
      question TEXT NOT NULL,
      description TEXT,
      category TEXT,
      close_date TEXT NOT NULL,
      resolution_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      current_price REAL,
      winning_outcome TEXT,
      volume REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Bets table
    CREATE TABLE IF NOT EXISTS bets (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      market_id TEXT NOT NULL,
      side TEXT NOT NULL,
      amount REAL NOT NULL,
      price REAL NOT NULL,
      confidence REAL,
      reasoning TEXT,
      raw_response TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      pnl REAL,
      polymarket_order_id TEXT,
      placed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (market_id) REFERENCES markets(id)
    );

    -- Equity snapshots table
    CREATE TABLE IF NOT EXISTS equity_snapshots (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      balance REAL NOT NULL,
      total_pl REAL NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_agents_season ON agents(season_id);
    CREATE INDEX IF NOT EXISTS idx_agents_balance ON agents(balance DESC);
    CREATE INDEX IF NOT EXISTS idx_bets_agent ON bets(agent_id, placed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bets_market ON bets(market_id);
    CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
    CREATE INDEX IF NOT EXISTS idx_snapshots_agent_time ON equity_snapshots(agent_id, timestamp DESC);
  `);

  // Check if we need to seed data
  const seasonCount = db.prepare('SELECT COUNT(*) as count FROM seasons').get() as { count: number };

  if (seasonCount.count === 0) {
    console.log('📊 Seeding initial data...');
    seedInitialData();
  }

  console.log('✅ Database initialized!');
}

// Seed initial data
function seedInitialData() {
  const seasonId = generateId();
  const now = new Date().toISOString();
  const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  // Insert Season 1
  db.prepare(`
    INSERT INTO seasons (id, name, season_number, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(seasonId, 'Season 1', 1, now, endDate, 'active');

  // Insert 6 agents
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

  // Insert sample market
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
    0.45
  );

  console.log('✅ Seeded Season 1 with 6 agents and 1 sample market');
}

// Helper to generate IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Export database instance
export default db;

// Export query helpers
export const queries = {
  // Agents
  getActiveAgents: () => {
    return db.prepare(`
      SELECT * FROM agents
      WHERE status = 'active'
      ORDER BY display_name
    `).all();
  },

  getAgentById: (id: string) => {
    return db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  },

  updateAgentBalance: (id: string, balance: number, totalBets: number, pendingBets: number) => {
    return db.prepare(`
      UPDATE agents
      SET balance = ?, total_bets = ?, pending_bets = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(balance, totalBets, pendingBets, id);
  },

  // Markets
  getActiveMarkets: () => {
    return db.prepare(`
      SELECT * FROM markets
      WHERE status = 'active' AND close_date > datetime('now')
      ORDER BY close_date
    `).all();
  },

  getMarketById: (id: string) => {
    return db.prepare('SELECT * FROM markets WHERE id = ?').get(id);
  },

  // Bets
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

  getBetsByAgent: (agentId: string) => {
    return db.prepare(`
      SELECT * FROM bets
      WHERE agent_id = ?
      ORDER BY placed_at DESC
    `).all(agentId);
  },

  // Equity snapshots
  insertSnapshot: (agentId: string, balance: number, totalPl: number) => {
    return db.prepare(`
      INSERT INTO equity_snapshots (id, agent_id, balance, total_pl)
      VALUES (?, ?, ?, ?)
    `).run(generateId(), agentId, balance, totalPl);
  },

  getSnapshotsByAgent: (agentId: string, limit: number = 100) => {
    return db.prepare(`
      SELECT * FROM equity_snapshots
      WHERE agent_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(agentId, limit);
  },

  // Stats
  getStats: () => {
    const agents = db.prepare('SELECT balance, total_pl FROM agents WHERE status = "active"').all() as Array<{balance: number, total_pl: number}>;
    const activeBets = db.prepare('SELECT COUNT(*) as count FROM bets WHERE status = "pending"').get() as { count: number };
    const activeMarkets = db.prepare('SELECT COUNT(*) as count FROM markets WHERE status = "active"').get() as { count: number };

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

// Initialize on import
if (typeof window === 'undefined') {
  // Only initialize on server side
  initializeDatabase();
}
