import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const databasePath = process.env.DATABASE_PATH;

if (!databasePath) {
  throw new Error('DATABASE_PATH must be set before preparing the e2e database');
}

const absoluteDatabasePath = path.resolve(process.cwd(), databasePath);
fs.mkdirSync(path.dirname(absoluteDatabasePath), { recursive: true });

for (const suffix of ['', '-shm', '-wal']) {
  fs.rmSync(`${absoluteDatabasePath}${suffix}`, { force: true });
}

const db = new Database(absoluteDatabasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE methodology_versions (
  version TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  changes_summary TEXT,
  effective_from_cohort INTEGER,
  document_hash TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cohorts (
  id TEXT PRIMARY KEY,
  cohort_number INTEGER NOT NULL UNIQUE,
  started_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  completed_at TEXT,
  methodology_version TEXT NOT NULL DEFAULT 'v1',
  initial_balance REAL NOT NULL DEFAULT 10000.00,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE models (
  id TEXT PRIMARY KEY,
  openrouter_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  color TEXT,
  is_active INTEGER DEFAULT 1,
  added_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  cash_balance REAL NOT NULL DEFAULT 10000.00,
  total_invested REAL NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cohort_id, model_id)
);

CREATE TABLE markets (
  id TEXT PRIMARY KEY,
  polymarket_id TEXT NOT NULL UNIQUE,
  slug TEXT,
  event_slug TEXT,
  question TEXT NOT NULL,
  description TEXT,
  category TEXT,
  market_type TEXT NOT NULL DEFAULT 'binary',
  outcomes TEXT,
  close_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_price REAL,
  current_prices TEXT,
  volume REAL,
  liquidity REAL,
  resolution_outcome TEXT,
  resolved_at TEXT,
  first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE positions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  side TEXT NOT NULL,
  shares REAL NOT NULL,
  avg_entry_price REAL NOT NULL,
  total_cost REAL NOT NULL,
  current_value REAL,
  unrealized_pnl REAL,
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,
  UNIQUE(agent_id, market_id, side)
);

CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  cohort_id TEXT NOT NULL,
  decision_week INTEGER NOT NULL,
  decision_timestamp TEXT NOT NULL,
  prompt_system TEXT NOT NULL,
  prompt_user TEXT NOT NULL,
  raw_response TEXT,
  parsed_response TEXT,
  retry_count INTEGER DEFAULT 0,
  action TEXT NOT NULL,
  reasoning TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  api_cost_usd REAL,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trades (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  position_id TEXT,
  decision_id TEXT,
  trade_type TEXT NOT NULL,
  side TEXT NOT NULL,
  shares REAL NOT NULL,
  price REAL NOT NULL,
  total_amount REAL NOT NULL,
  implied_confidence REAL,
  cost_basis REAL,
  realized_pnl REAL,
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE portfolio_snapshots (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  snapshot_timestamp TEXT NOT NULL,
  cash_balance REAL NOT NULL,
  positions_value REAL NOT NULL,
  total_value REAL NOT NULL,
  total_pnl REAL NOT NULL,
  total_pnl_percent REAL NOT NULL,
  brier_score REAL,
  num_resolved_bets INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, snapshot_timestamp)
);

CREATE TABLE brier_scores (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  trade_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  forecast_probability REAL NOT NULL,
  actual_outcome REAL NOT NULL,
  brier_score REAL NOT NULL,
  calculated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data TEXT,
  severity TEXT DEFAULT 'info',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

db.exec(`
INSERT INTO methodology_versions (version, title, description, effective_from_cohort)
VALUES ('v1', 'Forecaster Arena Methodology v1', 'E2E seeded methodology fixture', 1);

INSERT INTO models (id, openrouter_id, display_name, provider, color)
VALUES
  ('gpt-5.1', 'openai/gpt-5.2', 'GPT-5.2', 'OpenAI', '#10B981'),
  ('gemini-2.5-flash', 'google/gemini-3-pro-preview', 'Gemini 3 Pro', 'Google', '#3B82F6'),
  ('grok-4', 'x-ai/grok-4.1-fast', 'Grok 4.1', 'xAI', '#8B5CF6'),
  ('claude-opus-4.5', 'anthropic/claude-opus-4.5', 'Claude Opus 4.5', 'Anthropic', '#F59E0B'),
  ('deepseek-v3.1', 'deepseek/deepseek-v3.2', 'DeepSeek V3.2', 'DeepSeek', '#EF4444'),
  ('kimi-k2', 'moonshotai/kimi-k2-thinking', 'Kimi K2', 'Moonshot AI', '#EC4899'),
  ('qwen-3-next', 'qwen/qwen3-235b-a22b-2507', 'Qwen 3', 'Alibaba', '#06B6D4');
`);

const models = [
  { id: 'gpt-5.1', valueA: 10000, valueB: 10002.5, cash: 9995, invested: 5 },
  { id: 'gemini-2.5-flash', valueA: 10000, valueB: 10001, cash: 10000, invested: 0 },
  { id: 'grok-4', valueA: 10000, valueB: 9999.5, cash: 10000, invested: 0 },
  { id: 'claude-opus-4.5', valueA: 10000, valueB: 9998.75, cash: 10000, invested: 0 },
  { id: 'deepseek-v3.1', valueA: 10000, valueB: 10000.75, cash: 10000, invested: 0 },
  { id: 'kimi-k2', valueA: 10000, valueB: 10003, cash: 10000, invested: 0 },
  { id: 'qwen-3-next', valueA: 10000, valueB: 9999.25, cash: 10000, invested: 0 }
];

const cohortId = 'cohort-e2e-1';
const marketId = 'market-e2e-fed';
const nowA = '2026-03-02T00:00:00.000Z';
const nowB = '2026-03-07T00:00:00.000Z';

db.prepare(`
  INSERT INTO cohorts (id, cohort_number, started_at, status, methodology_version, initial_balance)
  VALUES (?, 1, ?, 'active', 'v1', 10000.00)
`).run(cohortId, nowA);

const insertAgent = db.prepare(`
  INSERT INTO agents (id, cohort_id, model_id, cash_balance, total_invested, status)
  VALUES (?, ?, ?, ?, ?, 'active')
`);

const insertSnapshot = db.prepare(`
  INSERT INTO portfolio_snapshots (
    id, agent_id, snapshot_timestamp, cash_balance, positions_value, total_value,
    total_pnl, total_pnl_percent, brier_score, num_resolved_bets
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const model of models) {
  const agentId = `agent-${model.id}`;
  insertAgent.run(agentId, cohortId, model.id, model.cash, model.invested);
  insertSnapshot.run(
    `snapshot-a-${model.id}`,
    agentId,
    nowA,
    10000,
    0,
    model.valueA,
    model.valueA - 10000,
    ((model.valueA - 10000) / 10000) * 100,
    null,
    0
  );
  insertSnapshot.run(
    `snapshot-b-${model.id}`,
    agentId,
    nowB,
    model.cash,
    model.valueB - model.cash,
    model.valueB,
    model.valueB - 10000,
    ((model.valueB - 10000) / 10000) * 100,
    null,
    0
  );
}

db.prepare(`
  INSERT INTO markets (
    id, polymarket_id, slug, event_slug, question, description, category, market_type,
    close_date, status, current_price, volume, liquidity, first_seen_at, last_updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 'binary', ?, 'active', ?, ?, ?, ?, ?)
`).run(
  marketId,
  'polymarket-fed-e2e',
  'fed-rate-cut-e2e',
  'fed-rates-e2e',
  'Will the Fed cut rates by 50+ bps in the seeded e2e market?',
  'Seeded binary market used for browser smoke coverage.',
  'Macro',
  '2026-12-31T00:00:00.000Z',
  0.55,
  250000,
  50000,
  nowA,
  nowB
);

db.prepare(`
  INSERT INTO positions (
    id, agent_id, market_id, side, shares, avg_entry_price, total_cost,
    current_value, unrealized_pnl, status, opened_at
  ) VALUES (?, ?, ?, 'YES', 10, 0.50, 5.00, 5.50, 0.50, 'open', ?)
`).run('position-gpt-fed', 'agent-gpt-5.1', marketId, nowB);

const insertDecision = db.prepare(`
  INSERT INTO decisions (
    id, agent_id, cohort_id, decision_week, decision_timestamp, prompt_system, prompt_user,
    raw_response, parsed_response, retry_count, action, reasoning, tokens_input,
    tokens_output, api_cost_usd, response_time_ms, error_message, created_at
  ) VALUES (?, ?, ?, 1, ?, 'system', 'user', '{}', '{}', 0, ?, ?, ?, ?, ?, 1200, NULL, ?)
`);

insertDecision.run(
  'decision-gpt-fed',
  'agent-gpt-5.1',
  cohortId,
  nowB,
  'BET',
  'The seeded market is priced below my conviction, so I am buying YES shares.',
  120,
  45,
  0.42,
  nowB
);

insertDecision.run(
  'decision-gemini-hold',
  'agent-gemini-2.5-flash',
  cohortId,
  nowB,
  'HOLD',
  'No seeded edge is large enough to justify a position this cycle.',
  80,
  30,
  0.18,
  nowB
);

db.prepare(`
  INSERT INTO trades (
    id, agent_id, market_id, position_id, decision_id, trade_type, side,
    shares, price, total_amount, implied_confidence, executed_at
  ) VALUES (?, ?, ?, ?, ?, 'BUY', 'YES', 10, 0.50, 5.00, 0.62, ?)
`).run('trade-gpt-fed', 'agent-gpt-5.1', marketId, 'position-gpt-fed', 'decision-gpt-fed', nowB);

const insertSystemLog = db.prepare(`
  INSERT INTO system_logs (id, event_type, event_data, severity, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

insertSystemLog.run(
  'log-seeded-info',
  'admin_seed_info',
  JSON.stringify({ source: 'prepare-e2e-db', ready: true }),
  'info',
  nowA
);
insertSystemLog.run(
  'log-seeded-warning',
  'admin_seed_warning',
  JSON.stringify({ warning: 'seeded browser warning' }),
  'warning',
  nowB
);
insertSystemLog.run(
  'log-seeded-error',
  'admin_seed_error',
  JSON.stringify({ error: 'seeded browser error' }),
  'error',
  nowB
);

db.close();
console.log(`Prepared e2e database at ${absoluteDatabasePath}`);
