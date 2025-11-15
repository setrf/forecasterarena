#!/usr/bin/env node

/**
 * Verify SQLite database setup
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data', 'forecaster.db');

console.log('🔍 Verifying SQLite database...\n');
console.log('Database path:', DB_PATH);
console.log('');

try {
  const db = new Database(DB_PATH, { readonly: true });

  // Check agents
  const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();
  const agents = db.prepare('SELECT display_name, balance, total_pl FROM agents').all();

  console.log('✅ AGENTS (' + agentCount.count + ' total):');
  agents.forEach(agent => {
    console.log(`  - ${agent.display_name}: $${agent.balance.toFixed(2)} (P/L: $${agent.total_pl.toFixed(2)})`);
  });
  console.log('');

  // Check markets
  const marketCount = db.prepare('SELECT COUNT(*) as count FROM markets').get();
  const markets = db.prepare('SELECT question, status, current_price FROM markets').all();

  console.log('✅ MARKETS (' + marketCount.count + ' total):');
  markets.forEach(market => {
    console.log(`  - ${market.question}`);
    console.log(`    Status: ${market.status}, Price: ${(market.current_price * 100).toFixed(1)}%`);
  });
  console.log('');

  // Check seasons
  const seasonCount = db.prepare('SELECT COUNT(*) as count FROM seasons').get();
  const season = db.prepare('SELECT name, status FROM seasons LIMIT 1').get();

  console.log('✅ SEASONS (' + seasonCount.count + ' total):');
  console.log(`  - ${season.name}: ${season.status}`);
  console.log('');

  // Check table structure
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('✅ DATABASE TABLES:');
  tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`  - ${table.name}: ${count.count} rows`);
  });
  console.log('');

  db.close();

  console.log('==========================================');
  console.log('✅ Database verification complete!');
  console.log('');
  console.log('Your SQLite database is properly set up and seeded.');
  console.log('You can now run: npm run dev');

} catch (error) {
  console.error('❌ Database verification failed:', error.message);
  process.exit(1);
}
