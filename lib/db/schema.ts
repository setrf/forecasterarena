/**
 * Database schema barrel.
 *
 * Public import path preserved for database initialization.
 */

import { INDEXES_SQL } from '@/lib/db/schema/indexes';
import { TABLES_SQL } from '@/lib/db/schema/tables';

export const SCHEMA_SQL = `${TABLES_SQL}\n\n${INDEXES_SQL}`;
export { SEED_METHODOLOGY_SQL, SEED_MODELS_SQL } from '@/lib/db/schema/seeds';
