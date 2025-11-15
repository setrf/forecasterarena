#!/usr/bin/env node

/**
 * Comprehensive test suite for Forecaster Arena
 * Tests all major components without external API calls
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 FORECASTER ARENA - COMPREHENSIVE TEST SUITE\n');
console.log('='.repeat(60));

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

// Test 1: Check critical files exist
console.log('\n📂 FILE STRUCTURE TESTS:');

test('lib/database.ts exists', () => {
  const exists = fs.existsSync(path.join(__dirname, '../lib/database.ts'));
  if (!exists) throw new Error('File not found');
});

test('lib/agents-sqlite.ts exists', () => {
  const exists = fs.existsSync(path.join(__dirname, '../lib/agents-sqlite.ts'));
  if (!exists) throw new Error('File not found');
});

test('lib/types.ts exists', () => {
  const exists = fs.existsSync(path.join(__dirname, '../lib/types.ts'));
  if (!exists) throw new Error('File not found');
});

test('lib/agents.ts does NOT exist (removed)', () => {
  const exists = fs.existsSync(path.join(__dirname, '../lib/agents.ts'));
  if (exists) throw new Error('Old Supabase file still exists!');
});

test('TEST_RESULTS.md does NOT exist (removed)', () => {
  const exists = fs.existsSync(path.join(__dirname, '../TEST_RESULTS.md'));
  if (exists) throw new Error('Outdated file still exists!');
});

test('SETUP.md does NOT exist (removed)', () => {
  const exists = fs.existsSync(path.join(__dirname, '../SETUP.md'));
  if (exists) throw new Error('Outdated file still exists!');
});

// Test 2: SQLite database
console.log('\n🗄️  DATABASE TESTS:');

const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, '../data/forecaster.db');

test('SQLite database file exists', () => {
  const exists = fs.existsSync(dbPath);
  if (!exists) throw new Error('Database file not found');
});

let db;
try {
  db = new Database(dbPath, { readonly: true });

  test('Database has 6 agents', () => {
    const count = db.prepare('SELECT COUNT(*) as count FROM agents').get();
    if (count.count !== 6) throw new Error(`Expected 6 agents, got ${count.count}`);
  });

  test('All agents have $1000 balance', () => {
    const agents = db.prepare('SELECT balance FROM agents').all();
    const allHave1000 = agents.every(a => a.balance === 1000);
    if (!allHave1000) throw new Error('Not all agents have $1000');
  });

  test('Database has 1 active market', () => {
    const count = db.prepare("SELECT COUNT(*) as count FROM markets WHERE status = 'active'").get();
    if (count.count !== 1) throw new Error(`Expected 1 active market, got ${count.count}`);
  });

  test('Database has Season 1', () => {
    const season = db.prepare("SELECT * FROM seasons WHERE name = 'Season 1'").get();
    if (!season) throw new Error('Season 1 not found');
    if (season.status !== 'active') throw new Error('Season 1 is not active');
  });

  test('All required tables exist', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);
    const required = ['seasons', 'agents', 'markets', 'bets', 'equity_snapshots'];
    const missing = required.filter(t => !tableNames.includes(t));
    if (missing.length > 0) throw new Error(`Missing tables: ${missing.join(', ')}`);
  });

  db.close();
} catch (error) {
  console.log(`❌ Database connection failed: ${error.message}`);
  if (db) db.close();
}

// Test 3: Component imports
console.log('\n🧩 COMPONENT TESTS:');

test('app/page.tsx imports from correct sources', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/page.tsx'), 'utf8');
  if (content.includes("from '@/lib/agents'") && !content.includes("from '@/lib/agents-sqlite'")) {
    throw new Error('Still importing from old lib/agents');
  }
  if (!content.includes("from '@/lib/database'")) {
    throw new Error('Not importing from lib/database');
  }
  if (!content.includes("from '@/lib/types'")) {
    throw new Error('Not importing Agent type from lib/types');
  }
});

test('components use shared types', () => {
  const leaderboard = fs.readFileSync(path.join(__dirname, '../components/LeaderboardTable.tsx'), 'utf8');
  const equity = fs.readFileSync(path.join(__dirname, '../components/EquityCurve.tsx'), 'utf8');

  if (!leaderboard.includes("from '@/lib/types'")) {
    throw new Error('LeaderboardTable not using shared types');
  }
  if (!equity.includes("from '@/lib/types'")) {
    throw new Error('EquityCurve not using shared types');
  }
});

test('cron job uses SQLite agents', () => {
  const cron = fs.readFileSync(path.join(__dirname, '../app/api/cron/tick/route.ts'), 'utf8');
  if (!cron.includes("from '@/lib/agents-sqlite'")) {
    throw new Error('Cron job not using SQLite agents');
  }
});

// Test 4: Environment and configuration
console.log('\n⚙️  CONFIGURATION TESTS:');

test('.env.local exists', () => {
  const exists = fs.existsSync(path.join(__dirname, '../.env.local'));
  if (!exists) throw new Error('.env.local not found');
});

test('.gitignore includes data directory', () => {
  const gitignore = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf8');
  if (!gitignore.includes('/data')) {
    throw new Error('.gitignore missing /data directory');
  }
  if (!gitignore.includes('*.db')) {
    throw new Error('.gitignore missing *.db pattern');
  }
});

test('package.json has better-sqlite3', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  if (!pkg.dependencies['better-sqlite3']) {
    throw new Error('better-sqlite3 not in dependencies');
  }
});

// Test 5: Documentation
console.log('\n📖 DOCUMENTATION TESTS:');

test('README.md mentions SQLite', () => {
  const readme = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8');
  if (!readme.toLowerCase().includes('sqlite')) {
    throw new Error('README does not mention SQLite');
  }
});

test('README.md has simplified quick start', () => {
  const readme = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8');
  if (readme.includes('Prerequisites') && readme.includes('Supabase account')) {
    throw new Error('README still lists Supabase as prerequisite');
  }
});

test('SQLITE_MIGRATION.md exists', () => {
  const exists = fs.existsSync(path.join(__dirname, '../SQLITE_MIGRATION.md'));
  if (!exists) throw new Error('Migration documentation not found');
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`\n📊 TEST RESULTS: ${passedTests}/${totalTests} tests passed\n`);

if (passedTests === totalTests) {
  console.log('🎉 ALL TESTS PASSED! 🎉');
  console.log('\n✅ Your Forecaster Arena is ready to use!');
  console.log('\nNext steps:');
  console.log('  1. npm run dev');
  console.log('  2. Open http://localhost:3000');
  console.log('  3. Test the cron job manually');
  console.log('\n');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log(`\nFailed: ${totalTests - passedTests} test(s)\n`);
  process.exit(1);
}
