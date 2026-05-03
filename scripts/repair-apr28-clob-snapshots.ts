import Database from 'better-sqlite3';
import path from 'node:path';

import { repairApr28Snapshots } from '@/lib/maintenance/repairApr28Snapshots';

const apply = process.argv.includes('--apply');
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'forecaster.db');

async function main() {
  const db = new Database(dbPath);

  try {
    const report = await repairApr28Snapshots({ db, apply });
    console.log(JSON.stringify({
      ...report,
      database_path: dbPath
    }, null, 2));
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
