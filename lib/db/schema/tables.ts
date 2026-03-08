import { ANALYTICS_TABLES_SQL } from '@/lib/db/schema/tables/analytics';
import { BENCHMARK_TABLES_SQL } from '@/lib/db/schema/tables/benchmark';
import { CATALOG_TABLES_SQL } from '@/lib/db/schema/tables/catalog';
import { DECISION_TABLES_SQL } from '@/lib/db/schema/tables/decisions';
import { MARKET_TABLES_SQL } from '@/lib/db/schema/tables/markets';
import { SYSTEM_TABLES_SQL } from '@/lib/db/schema/tables/system';

export const TABLES_SQL = [
  BENCHMARK_TABLES_SQL,
  CATALOG_TABLES_SQL,
  MARKET_TABLES_SQL,
  DECISION_TABLES_SQL,
  ANALYTICS_TABLES_SQL,
  SYSTEM_TABLES_SQL
].join('\n\n');
