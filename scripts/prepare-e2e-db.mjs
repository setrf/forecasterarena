import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createSchema } from './e2e-db/schema.mjs';
import { seedEmptyScenario } from './e2e-db/scenarios/empty.mjs';
import { seedRichScenario } from './e2e-db/scenarios/rich.mjs';

const databasePath = process.env.DATABASE_PATH;
const scenario = process.env.E2E_SEED_SCENARIO || 'rich';

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

createSchema(db);

switch (scenario) {
  case 'empty':
    seedEmptyScenario(db);
    break;
  case 'rich':
    seedRichScenario(db);
    break;
  default:
    throw new Error(`Unknown e2e seed scenario: ${scenario}`);
}

db.close();
console.log(`Prepared ${scenario} e2e database at ${absoluteDatabasePath}`);
