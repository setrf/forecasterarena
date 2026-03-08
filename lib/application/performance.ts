import { getPublicCatalogModels } from '@/lib/catalog/public';
import { getDb } from '@/lib/db';

export type PerformanceTimeRange = '10M' | '1H' | '1D' | '1W' | '1M' | '3M' | 'ALL';

const VALID_RANGES = new Set<PerformanceTimeRange>(['10M', '1H', '1D', '1W', '1M', '3M', 'ALL']);

function normalizeRange(rawRange: string | null): PerformanceTimeRange {
  return VALID_RANGES.has(rawRange as PerformanceTimeRange)
    ? rawRange as PerformanceTimeRange
    : '1M';
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

  return start.toISOString();
}

export function getPerformanceData(rawRange: string | null, cohortId: string | null) {
  const range = normalizeRange(rawRange);
  const db = getDb();
  const params: Array<string | number> = [getRangeStart(range, new Date())];

  let query = `
    SELECT
      ps.snapshot_timestamp,
      COALESCE(abi.family_slug, abi.family_id, abi.legacy_model_id, a.model_id) as model_id,
      abi.family_id,
      COALESCE(abi.family_display_name, abi.release_display_name, a.model_id) as display_name,
      COALESCE(abi.color, '#94A3B8') as color,
      ps.total_value
    FROM portfolio_snapshots ps
    JOIN agents a ON ps.agent_id = a.id
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    WHERE ps.snapshot_timestamp >= ?
  `;

  if (cohortId) {
    query += ' AND a.cohort_id = ?';
    params.push(cohortId);
  }

  query += ' ORDER BY ps.snapshot_timestamp ASC, display_name ASC';

  const rows = db.prepare(query).all(...params) as Array<{
    snapshot_timestamp: string;
    model_id: string;
    family_id: string | null;
    display_name: string;
    color: string;
    total_value: number;
  }>;

  const dataByDate = new Map<string, Record<string, number | string>>();
  const countsByDate = new Map<string, Record<string, number>>();

  for (const row of rows) {
    if (!dataByDate.has(row.snapshot_timestamp)) {
      dataByDate.set(row.snapshot_timestamp, { date: row.snapshot_timestamp });
      countsByDate.set(row.snapshot_timestamp, {});
    }

    const dateData = dataByDate.get(row.snapshot_timestamp)!;
    const counts = countsByDate.get(row.snapshot_timestamp)!;

    if (dateData[row.model_id] === undefined) {
      dateData[row.model_id] = row.total_value;
      counts[row.model_id] = 1;
    } else {
      dateData[row.model_id] = (dateData[row.model_id] as number) + row.total_value;
      counts[row.model_id] = (counts[row.model_id] || 1) + 1;
    }
  }

  dataByDate.forEach((dateData, timestamp) => {
    const counts = countsByDate.get(timestamp)!;
    Object.keys(counts).forEach((modelId) => {
      if (counts[modelId] > 1) {
        dateData[modelId] = (dateData[modelId] as number) / counts[modelId];
      }
    });
  });

  return {
    data: Array.from(dataByDate.values()),
    models: getPublicCatalogModels(),
    range,
    updated_at: new Date().toISOString()
  };
}
