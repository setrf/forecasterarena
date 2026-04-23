import { getDb } from '@/lib/db/connection';

export function withTransaction<T>(fn: () => T): T {
  const database = getDb();
  if (database.inTransaction) {
    return fn();
  }

  return database.transaction(fn)();
}

export function withImmediateTransaction<T>(fn: () => T): T {
  const database = getDb();

  if (database.inTransaction) {
    return fn();
  }

  database.exec('BEGIN IMMEDIATE');

  try {
    const result = fn();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    if (database.inTransaction) {
      database.exec('ROLLBACK');
    }

    throw error;
  }
}
