/**
 * Database facade.
 *
 * Public import path preserved while the implementation is split by concern.
 */

export { createBackup } from '@/lib/db/backup';
export { closeDb, getDb } from '@/lib/db/connection';
export { generateId } from '@/lib/db/ids';
export { logSystemEvent } from '@/lib/db/logging';
export { getDbStats } from '@/lib/db/stats';
export { withImmediateTransaction, withTransaction } from '@/lib/db/transactions';
export { getDb as default } from '@/lib/db/connection';
