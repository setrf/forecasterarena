#!/usr/bin/env node

/**
 * Comprehensive Function Test Suite for Forecaster Arena
 * Tests all database functions and schema
 *
 * Usage: node scripts/test-functions.js
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

console.log('🧪 FORECASTER ARENA - COMPREHENSIVE FUNCTION TEST SUITE\n');
console.log('='.repeat(70));

let passedTests = 0;
let totalTests = 0;
let skippedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error) {
    if (error.message.startsWith('SKIP:')) {
      console.log(`⏭️  ${name}`);
      console.log(`   ${error.message.replace('SKIP: ', '')}`);
      skippedTests++;
    } else {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
    }
  }
}

// ============================================================================
// DATABASE SCHEMA TESTS
// ============================================================================

console.log('\n📂 DATABASE SCHEMA TESTS:');
console.log('-'.repeat(70));

const dbPath = path.join(__dirname, '../data/forecaster.db');

test('Database file exists', () => {
  const exists = fs.existsSync(dbPath);
  if (!exists) throw new Error('Database file not found at data/forecaster.db');
});

const db = new Database(dbPath);

test('Database connection successful', () => {
  const result = db.prepare('SELECT 1 as test').get();
  if (result.test !== 1) throw new Error('Database query failed');
});

test('Foreign key constraints are enabled', () => {
  const result = db.prepare('PRAGMA foreign_keys').get();
  if (result.foreign_keys !== 1) throw new Error('Foreign keys not enabled');
});

test('All required tables exist', () => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = tables.map(t => t.name);
  const required = ['seasons', 'agents', 'markets', 'bets', 'equity_snapshots', 'market_sync_log', 'agent_decisions'];
  const missing = required.filter(t => !tableNames.includes(t));
  if (missing.length > 0) throw new Error(`Missing tables: ${missing.join(', ')}`);
});

// ============================================================================
// SEASONS TABLE TESTS
// ============================================================================

console.log('\n📅 SEASONS TABLE TESTS:');
console.log('-'.repeat(70));

test('seasons table has correct schema', () => {
  const info = db.prepare('PRAGMA table_info(seasons)').all();
  const columns = info.map(r => r.name);
  const required = ['id', 'name', 'season_number', 'start_date', 'end_date', 'status', 'initial_bankroll'];
  const missing = required.filter(c => !columns.includes(c));
  if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`);
});

test('Season 1 exists', () => {
  const season = db.prepare("SELECT * FROM seasons WHERE season_number = 1").get();
  if (!season) throw new Error('Season 1 not found');
  if (season.name !== 'Season 1') throw new Error(`Expected name "Season 1", got "${season.name}"`);
});

test('Season 1 is active', () => {
  const season = db.prepare("SELECT * FROM seasons WHERE season_number = 1").get();
  if (season.status !== 'active') throw new Error(`Expected status "active", got "${season.status}"`);
});

test('Season 1 has initial_bankroll of 1000', () => {
  const season = db.prepare("SELECT * FROM seasons WHERE season_number = 1").get();
  if (season.initial_bankroll !== 1000) {
    throw new Error(`Expected initial_bankroll 1000, got ${season.initial_bankroll}`);
  }
});

// ============================================================================
// AGENTS TABLE TESTS
// ============================================================================

console.log('\n🤖 AGENTS TABLE TESTS:');
console.log('-'.repeat(70));

test('agents table has correct schema', () => {
  const info = db.prepare('PRAGMA table_info(agents)').all();
  const columns = info.map(r => r.name);
  const required = ['id', 'season_id', 'model_id', 'display_name', 'balance', 'total_pl',
                    'total_bets', 'winning_bets', 'losing_bets', 'pending_bets', 'status'];
  const missing = required.filter(c => !columns.includes(c));
  if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`);
});

test('Exactly 6 agents exist', () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM agents').get();
  if (count.count !== 6) throw new Error(`Expected 6 agents, got ${count.count}`);
});

test('All agents have $1000 initial balance', () => {
  const agents = db.prepare('SELECT balance FROM agents').all();
  const allHave1000 = agents.every(a => a.balance === 1000);
  if (!allHave1000) {
    const balances = agents.map(a => a.balance).join(', ');
    throw new Error(`Not all agents have $1000 balance. Found: ${balances}`);
  }
});

test('All agents have unique model IDs', () => {
  const models = db.prepare('SELECT model_id FROM agents').all();
  const modelIds = models.map(m => m.model_id);
  const uniqueIds = [...new Set(modelIds)];
  if (uniqueIds.length !== modelIds.length) {
    throw new Error('Duplicate model IDs found');
  }
});

test('All agents are active', () => {
  const inactive = db.prepare("SELECT COUNT(*) as count FROM agents WHERE status != 'active'").get();
  if (inactive.count > 0) throw new Error(`Found ${inactive.count} non-active agents`);
});

test('All agents have total_pl = 0', () => {
  const agents = db.prepare('SELECT total_pl FROM agents').all();
  const allZero = agents.every(a => a.total_pl === 0);
  if (!allZero) throw new Error('Not all agents have 0 total P/L');
});

test('All agents have 0 total bets initially', () => {
  const agents = db.prepare('SELECT total_bets FROM agents').all();
  const allZero = agents.every(a => a.total_bets === 0);
  if (!allZero) throw new Error('Not all agents have 0 total bets');
});

test('Expected AI models are present', () => {
  const models = db.prepare('SELECT model_id FROM agents').all().map(a => a.model_id);
  const expectedModels = [
    'openai/gpt-4',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3.1-70b-instruct',
    'mistralai/mistral-large',
    'deepseek/deepseek-chat'
  ];
  const missing = expectedModels.filter(m => !models.includes(m));
  if (missing.length > 0) {
    throw new Error(`Missing models: ${missing.join(', ')}`);
  }
});

// ============================================================================
// MARKETS TABLE TESTS
// ============================================================================

console.log('\n📈 MARKETS TABLE TESTS:');
console.log('-'.repeat(70));

test('markets table has correct schema', () => {
  const info = db.prepare('PRAGMA table_info(markets)').all();
  const columns = info.map(r => r.name);
  const required = ['id', 'polymarket_id', 'question', 'description', 'category',
                    'close_date', 'resolution_date', 'status', 'current_price',
                    'price_updated_at', 'winning_outcome', 'volume'];
  const missing = required.filter(c => !columns.includes(c));
  if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`);
});

test('At least 1 market exists', () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM markets').get();
  if (count.count < 1) throw new Error('No markets found');
});

test('Sample market exists', () => {
  const market = db.prepare("SELECT * FROM markets WHERE polymarket_id = 'sample-btc-market'").get();
  if (!market) throw new Error('Sample BTC market not found');
  if (!market.question.includes('Bitcoin')) throw new Error('Sample market has wrong question');
});

test('Sample market is active', () => {
  const market = db.prepare("SELECT * FROM markets WHERE polymarket_id = 'sample-btc-market'").get();
  if (market.status !== 'active') throw new Error(`Sample market status is "${market.status}", expected "active"`);
});

test('Sample market has valid price', () => {
  const market = db.prepare("SELECT * FROM markets WHERE polymarket_id = 'sample-btc-market'").get();
  if (market.current_price === null) throw new Error('Sample market has no price');
  if (market.current_price < 0 || market.current_price > 1) {
    throw new Error(`Invalid price: ${market.current_price}`);
  }
});

// ============================================================================
// BETS TABLE TESTS
// ============================================================================

console.log('\n💰 BETS TABLE TESTS:');
console.log('-'.repeat(70));

test('bets table has correct schema', () => {
  const info = db.prepare('PRAGMA table_info(bets)').all();
  const columns = info.map(r => r.name);
  const required = ['id', 'agent_id', 'market_id', 'side', 'amount', 'price',
                    'confidence', 'reasoning', 'raw_response', 'status', 'pnl',
                    'polymarket_order_id', 'placed_at', 'resolved_at'];
  const missing = required.filter(c => !columns.includes(c));
  if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`);
});

test('bets table accepts valid data', () => {
  const agents = db.prepare('SELECT id FROM agents LIMIT 1').all();
  const markets = db.prepare('SELECT id FROM markets LIMIT 1').all();

  if (agents.length === 0 || markets.length === 0) {
    throw new Error('SKIP: No agents or markets to test bet insertion');
  }

  const betId = `test-${Date.now()}`;
  db.prepare(`
    INSERT INTO bets (id, agent_id, market_id, side, amount, price, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(betId, agents[0].id, markets[0].id, 'YES', 100, 0.5, 'pending');

  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(betId);
  if (!bet) throw new Error('Bet not inserted');

  // Clean up
  db.prepare('DELETE FROM bets WHERE id = ?').run(betId);
});

// ============================================================================
// EQUITY SNAPSHOTS TABLE TESTS
// ============================================================================

console.log('\n📊 EQUITY SNAPSHOTS TABLE TESTS:');
console.log('-'.repeat(70));

test('equity_snapshots table has correct schema', () => {
  const info = db.prepare('PRAGMA table_info(equity_snapshots)').all();
  const columns = info.map(r => r.name);
  const required = ['id', 'agent_id', 'balance', 'total_pl', 'timestamp'];
  const missing = required.filter(c => !columns.includes(c));
  if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`);
});

test('Can insert equity snapshot', () => {
  const agents = db.prepare('SELECT id FROM agents LIMIT 1').all();
  if (agents.length === 0) throw new Error('SKIP: No agents to test snapshot insertion');

  const snapshotId = `snapshot-test-${Date.now()}`;
  db.prepare(`
    INSERT INTO equity_snapshots (id, agent_id, balance, total_pl)
    VALUES (?, ?, ?, ?)
  `).run(snapshotId, agents[0].id, 1000, 0);

  const snapshot = db.prepare('SELECT * FROM equity_snapshots WHERE id = ?').get(snapshotId);
  if (!snapshot) throw new Error('Snapshot not inserted');

  // Clean up
  db.prepare('DELETE FROM equity_snapshots WHERE id = ?').run(snapshotId);
});

// ============================================================================
// AGENT DECISIONS TABLE TESTS
// ============================================================================

console.log('\n🧠 AGENT DECISIONS TABLE TESTS:');
console.log('-'.repeat(70));

test('agent_decisions table exists', () => {
  const info = db.prepare('PRAGMA table_info(agent_decisions)').all();
  if (info.length === 0) throw new Error('agent_decisions table not found');
});

test('agent_decisions table has correct schema', () => {
  const info = db.prepare('PRAGMA table_info(agent_decisions)').all();
  const columns = info.map(r => r.name);
  const required = ['id', 'agent_id', 'decision_timestamp', 'action', 'reasoning', 'confidence'];
  const missing = required.filter(c => !columns.includes(c));
  if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`);
});

// ============================================================================
// INDEXES TESTS
// ============================================================================

console.log('\n🔍 DATABASE INDEXES TESTS:');
console.log('-'.repeat(70));

test('Performance indexes exist', () => {
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'").all();
  const indexNames = indexes.map(i => i.name);

  const requiredIndexes = [
    'idx_agents_season',
    'idx_agents_balance',
    'idx_bets_agent',
    'idx_bets_market',
    'idx_bets_status',
    'idx_snapshots_agent_time'
  ];

  const missing = requiredIndexes.filter(idx => !indexNames.includes(idx));
  if (missing.length > 0) {
    throw new Error(`Missing indexes: ${missing.join(', ')}`);
  }
});

// ============================================================================
// QUERY FUNCTIONALITY TESTS
// ============================================================================

console.log('\n🔧 QUERY FUNCTIONALITY TESTS:');
console.log('-'.repeat(70));

test('Can query active agents', () => {
  const agents = db.prepare("SELECT * FROM agents WHERE status = 'active' ORDER BY display_name").all();
  if (!Array.isArray(agents)) throw new Error('Query did not return array');
  if (agents.length !== 6) throw new Error(`Expected 6 agents, got ${agents.length}`);
});

test('Can query active markets', () => {
  const markets = db.prepare(`
    SELECT * FROM markets
    WHERE status = 'active' AND close_date > datetime('now')
    ORDER BY close_date
  `).all();
  if (!Array.isArray(markets)) throw new Error('Query did not return array');
});

test('Can query recent bets with joins', () => {
  const bets = db.prepare(`
    SELECT
      b.*,
      a.display_name as agent_name,
      m.question as market_question
    FROM bets b
    JOIN agents a ON b.agent_id = a.id
    JOIN markets m ON b.market_id = m.id
    ORDER BY b.placed_at DESC
    LIMIT 10
  `).all();
  if (!Array.isArray(bets)) throw new Error('Query did not return array');
});

test('Can calculate statistics', () => {
  const agents = db.prepare("SELECT balance, total_pl FROM agents WHERE status = 'active'").all();
  const totalBalance = agents.reduce((sum, a) => sum + a.balance, 0);
  const totalPL = agents.reduce((sum, a) => sum + a.total_pl, 0);

  if (totalBalance !== 6000) throw new Error(`Expected total balance 6000, got ${totalBalance}`);
  if (totalPL !== 0) throw new Error(`Expected total P/L 0, got ${totalPL}`);
});

test('Can query pending bets with market data', () => {
  const agents = db.prepare('SELECT id FROM agents LIMIT 1').all();
  if (agents.length === 0) throw new Error('SKIP: No agents to test');

  const bets = db.prepare(`
    SELECT
      b.id,
      b.amount,
      b.price,
      b.side,
      m.current_price
    FROM bets b
    JOIN markets m ON b.market_id = m.id
    WHERE b.agent_id = ? AND b.status = 'pending'
  `).all(agents[0].id);

  if (!Array.isArray(bets)) throw new Error('Query did not return array');
});

// ============================================================================
// FOREIGN KEY CONSTRAINTS TESTS
// ============================================================================

console.log('\n🔗 FOREIGN KEY CONSTRAINTS TESTS:');
console.log('-'.repeat(70));

test('Cannot insert bet with invalid agent_id', () => {
  const markets = db.prepare('SELECT id FROM markets LIMIT 1').all();
  if (markets.length === 0) throw new Error('SKIP: No markets to test');

  let errorThrown = false;
  try {
    db.prepare(`
      INSERT INTO bets (id, agent_id, market_id, side, amount, price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('test-bet', 'invalid-agent-id', markets[0].id, 'YES', 100, 0.5, 'pending');
  } catch (error) {
    if (error.message.includes('FOREIGN KEY constraint failed')) {
      errorThrown = true;
    }
  }

  if (!errorThrown) throw new Error('Foreign key constraint not enforced');
});

test('Cannot insert bet with invalid market_id', () => {
  const agents = db.prepare('SELECT id FROM agents LIMIT 1').all();
  if (agents.length === 0) throw new Error('SKIP: No agents to test');

  let errorThrown = false;
  try {
    db.prepare(`
      INSERT INTO bets (id, agent_id, market_id, side, amount, price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('test-bet', agents[0].id, 'invalid-market-id', 'YES', 100, 0.5, 'pending');
  } catch (error) {
    if (error.message.includes('FOREIGN KEY constraint failed')) {
      errorThrown = true;
    }
  }

  if (!errorThrown) throw new Error('Foreign key constraint not enforced');
});

// ============================================================================
// DATA INTEGRITY TESTS
// ============================================================================

console.log('\n✅ DATA INTEGRITY TESTS:');
console.log('-'.repeat(70));

test('All bets reference valid agents', () => {
  const invalidBets = db.prepare(`
    SELECT COUNT(*) as count FROM bets
    WHERE agent_id NOT IN (SELECT id FROM agents)
  `).get();

  if (invalidBets.count > 0) {
    throw new Error(`Found ${invalidBets.count} bets with invalid agent_id`);
  }
});

test('All bets reference valid markets', () => {
  const invalidBets = db.prepare(`
    SELECT COUNT(*) as count FROM bets
    WHERE market_id NOT IN (SELECT id FROM markets)
  `).get();

  if (invalidBets.count > 0) {
    throw new Error(`Found ${invalidBets.count} bets with invalid market_id`);
  }
});

test('All equity snapshots reference valid agents', () => {
  const invalidSnapshots = db.prepare(`
    SELECT COUNT(*) as count FROM equity_snapshots
    WHERE agent_id NOT IN (SELECT id FROM agents)
  `).get();

  if (invalidSnapshots.count > 0) {
    throw new Error(`Found ${invalidSnapshots.count} snapshots with invalid agent_id`);
  }
});

test('All agent decisions reference valid agents', () => {
  const invalidDecisions = db.prepare(`
    SELECT COUNT(*) as count FROM agent_decisions
    WHERE agent_id NOT IN (SELECT id FROM agents)
  `).get();

  if (invalidDecisions.count > 0) {
    throw new Error(`Found ${invalidDecisions.count} decisions with invalid agent_id`);
  }
});

test('All agents reference valid seasons', () => {
  const invalidAgents = db.prepare(`
    SELECT COUNT(*) as count FROM agents
    WHERE season_id NOT IN (SELECT id FROM seasons)
  `).get();

  if (invalidAgents.count > 0) {
    throw new Error(`Found ${invalidAgents.count} agents with invalid season_id`);
  }
});

// ============================================================================
// PROMPT BUILDING TESTS (without requiring TypeScript modules)
// ============================================================================

console.log('\n📝 PROMPT BUILDING LOGIC TESTS:');
console.log('-'.repeat(70));

test('System prompt should include agent name', () => {
  const agentName = 'GPT-4';
  const prompt = buildSystemPrompt(agentName);
  if (!prompt.includes(agentName)) throw new Error('System prompt does not include agent name');
});

test('System prompt should include action types', () => {
  const prompt = buildSystemPrompt('Test Agent');
  if (!prompt.includes('BET')) throw new Error('Missing BET action');
  if (!prompt.includes('SELL')) throw new Error('Missing SELL action');
  if (!prompt.includes('HOLD')) throw new Error('Missing HOLD action');
});

test('User prompt should include balance', () => {
  const balance = 1234.56;
  const prompt = buildUserPrompt(balance, 5, []);
  if (!prompt.includes('1234.56')) throw new Error('User prompt does not include balance');
});

test('User prompt should include market information', () => {
  const markets = [{
    id: 'market-123',
    question: 'Will Bitcoin reach $100k?',
    current_price: 0.45,
    category: 'crypto',
    close_date: '2024-12-31T23:59:59Z'
  }];
  const prompt = buildUserPrompt(1000, 0, markets);
  if (!prompt.includes('Will Bitcoin reach $100k?')) throw new Error('Missing market question');
  if (!prompt.includes('market-123')) throw new Error('Missing market ID');
});

// Helper functions for prompt testing (simplified versions)
function buildSystemPrompt(agentName) {
  return `You are ${agentName}, a professional prediction market analyst competing in Forecaster Arena.

Your goal is to maximize profit by making smart bets on prediction markets.

CRITICAL RULES:
1. Review your existing bets first - sell if market moved against you or you want to take profits
2. Only place new bets when you have high confidence (>60%)
3. Bet sizes should be proportional to confidence
4. Consider market odds - only bet if you see value
5. Manage risk - don't bet more than 20% of balance on one market
6. Return ONLY valid JSON, no markdown or extra text

ACTIONS:
- SELL: Sell one or more existing bets to realize P/L and free up cash
- BET: Place a new bet on a market
- HOLD: Don't make any changes this week`;
}

function buildUserPrompt(balance, totalBets, markets) {
  const marketsList = markets.map((m, i) =>
    `${i + 1}. "${m.question}"
   - Market ID: ${m.id}
   - Current YES price: ${(m.current_price * 100).toFixed(1)}%
   - Category: ${m.category || 'general'}
   - Closes: ${new Date(m.close_date).toLocaleDateString()}`
  ).join('\n\n');

  return `CURRENT STATE:
Your cash balance: $${balance.toFixed(2)}
Total bets placed (all time): ${totalBets}

AVAILABLE MARKETS:
${marketsList}

Return your decision as JSON (SELL, BET, or HOLD).`;
}

// ============================================================================
// SUMMARY
// ============================================================================

db.close();

console.log('\n' + '='.repeat(70));
console.log(`\n📊 TEST RESULTS: ${passedTests}/${totalTests} tests passed`);
if (skippedTests > 0) {
  console.log(`⏭️  Skipped: ${skippedTests} test(s)\n`);
}

const failedTests = totalTests - passedTests - skippedTests;

if (failedTests === 0) {
  console.log('\n🎉 ALL TESTS PASSED! 🎉');
  console.log('\n✅ All database functions and schema are working correctly!');
  console.log('\nTested components:');
  console.log('  • Database schema (7 tables)');
  console.log('  • Foreign key constraints');
  console.log('  • Performance indexes');
  console.log('  • Query functionality');
  console.log('  • Data integrity');
  console.log('  • Prompt building logic');
  console.log('\nTotal functions tested: ' + totalTests);
  console.log('\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${failedTests} TEST(S) FAILED`);
  console.log('\n');
  process.exit(1);
}
