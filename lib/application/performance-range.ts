import { getDb } from '@/lib/db';
import type { PerformanceScope, PerformanceTimeRange } from '@/lib/application/performance';

export function getRangeStartForLatestSnapshot(
  range: PerformanceTimeRange,
  scope: Required<PerformanceScope>
): string {
  return getRangeStart(range, getLatestSnapshotDateForScope(scope));
}

function getRangeStart(range: PerformanceTimeRange, now: Date): string {
  const start = new Date(now);

  switch (range) {
    case '10M':
      start.setMinutes(start.getMinutes() - 10);
      break;
    case '1H':
      start.setHours(start.getHours() - 1);
      break;
    case '1D':
      start.setDate(start.getDate() - 1);
      break;
    case '1W':
      start.setDate(start.getDate() - 7);
      break;
    case '1M':
      start.setMonth(start.getMonth() - 1);
      break;
    case '3M':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'ALL':
      start.setFullYear(start.getFullYear() - 10);
      break;
  }

  return toSqliteUtcTimestamp(start);
}

function getLatestSnapshotDateForScope(scope: Required<PerformanceScope>): Date {
  const db = getDb();

  if (!scope.cohortId && !scope.familyId) {
    const row = db.prepare(`
      SELECT ps.snapshot_timestamp
      FROM portfolio_snapshots ps INDEXED BY idx_snapshots_timestamp_agent_value
      JOIN agents a ON a.id = ps.agent_id
      JOIN cohorts c ON c.id = a.cohort_id
      WHERE COALESCE(c.is_archived, 0) = 0
      ORDER BY ps.snapshot_timestamp DESC
      LIMIT 1
    `).get() as { snapshot_timestamp: string } | undefined;
    const parsedAt = row ? parseSqliteUtcTimestamp(row.snapshot_timestamp) : null;
    return parsedAt === null ? new Date() : new Date(parsedAt);
  }

  const row = db.prepare(`
    SELECT MAX(ps.snapshot_timestamp) as snapshot_timestamp
    FROM portfolio_snapshots ps INDEXED BY idx_snapshots_timestamp_agent_value
    JOIN agents a ON a.id = ps.agent_id
    JOIN cohorts c ON c.id = a.cohort_id
    WHERE (? IS NULL OR a.cohort_id = ?)
      AND (? IS NULL OR a.family_id = ?)
      AND (? IS NOT NULL OR COALESCE(c.is_archived, 0) = 0)
  `).get(
    scope.cohortId,
    scope.cohortId,
    scope.familyId,
    scope.familyId,
    scope.cohortId
  ) as { snapshot_timestamp: string | null } | undefined;

  const parsedAt = row?.snapshot_timestamp
    ? parseSqliteUtcTimestamp(row.snapshot_timestamp)
    : null;
  return parsedAt === null ? new Date() : new Date(parsedAt);
}

function toSqliteUtcTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function parseSqliteUtcTimestamp(timestamp: string): number | null {
  const parsed = Date.parse(timestamp.includes('T') ? timestamp : `${timestamp.replace(' ', 'T')}Z`);
  return Number.isNaN(parsed) ? null : parsed;
}
