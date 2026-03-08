import { getPublicCatalogModels } from '@/lib/catalog/public';
import { getDb } from '@/lib/db';

export type PerformanceTimeRange = '10M' | '1H' | '1D' | '1W' | '1M' | '3M' | 'ALL';
export interface ReleaseChangeEvent {
  date: string;
  model_id: string;
  model_name: string;
  previous_release_name: string;
  release_name: string;
  color: string;
}

interface PerformancePayload {
  data: Array<Record<string, number | string>>;
  models: ReturnType<typeof getPublicCatalogModels>;
  release_changes: ReleaseChangeEvent[];
  range: PerformanceTimeRange;
  updated_at: string;
}

const VALID_RANGES = new Set<PerformanceTimeRange>(['10M', '1H', '1D', '1W', '1M', '3M', 'ALL']);
const PERFORMANCE_CACHE_TTL_MS = 15_000;

const performanceCache = new Map<string, {
  expiresAt: number;
  data: PerformancePayload;
}>();

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

function getBucketSeconds(range: PerformanceTimeRange): number {
  switch (range) {
    case '10M':
    case '1H':
    case '1D':
      return 600;
    case '1W':
      return 3600;
    case '1M':
      return 21600;
    case '3M':
      return 86400;
    case 'ALL':
      return 604800;
  }
}

function buildPerformanceCacheKey(range: PerformanceTimeRange, cohortId: string | null): string {
  return `${range}::${cohortId ?? 'all'}`;
}

function readPersistedPerformanceData(
  range: PerformanceTimeRange,
  cohortId: string | null
): Array<Record<string, number | string>> | null {
  if (cohortId) {
    return null;
  }

  const db = getDb();
  const row = db.prepare(`
    SELECT payload_json
    FROM performance_chart_cache
    WHERE cache_key = ?
    LIMIT 1
  `).get(buildPerformanceCacheKey(range, cohortId)) as { payload_json: string } | undefined;

  if (!row?.payload_json) {
    return null;
  }

  try {
    const parsed = JSON.parse(row.payload_json);
    return Array.isArray(parsed) ? parsed as Array<Record<string, number | string>> : null;
  } catch {
    return null;
  }
}

function writePersistedPerformanceData(
  range: PerformanceTimeRange,
  cohortId: string | null,
  data: Array<Record<string, number | string>>
): void {
  if (cohortId) {
    return;
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO performance_chart_cache (
      cache_key, cohort_id, range_key, payload_json, generated_at
    ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(cache_key) DO UPDATE SET
      payload_json = excluded.payload_json,
      generated_at = CURRENT_TIMESTAMP
  `).run(
    buildPerformanceCacheKey(range, cohortId),
    cohortId,
    range,
    JSON.stringify(data)
  );
}

export function getReleaseChangeEvents(args?: {
  cohortId?: string | null;
  familyId?: string | null;
}): ReleaseChangeEvent[] {
  const db = getDb();
  const params: Array<string> = [];
  let query = `
    SELECT
      MIN(d.decision_timestamp) as first_decision_at,
      COALESCE(dbi.family_slug, dbi.family_id, d.family_id) as model_id,
      COALESCE(dbi.family_display_name, dbi.release_display_name, a.model_id) as model_name,
      COALESCE(dbi.release_display_name, mr.release_name) as release_name,
      COALESCE(dbi.color, '#94A3B8') as color,
      COALESCE(dbi.release_id, d.release_id) as release_id
    FROM decisions d
    JOIN agents a ON a.id = d.agent_id
    LEFT JOIN decision_benchmark_identity_v dbi ON dbi.decision_id = d.id
    LEFT JOIN model_releases mr ON mr.id = d.release_id
    WHERE COALESCE(dbi.release_id, d.release_id) IS NOT NULL
  `;

  if (args?.cohortId) {
    query += ' AND d.cohort_id = ?';
    params.push(args.cohortId);
  }

  if (args?.familyId) {
    query += ' AND COALESCE(dbi.family_id, d.family_id) = ?';
    params.push(args.familyId);
  }

  query += `
    GROUP BY
      COALESCE(dbi.family_slug, dbi.family_id, d.family_id),
      COALESCE(dbi.family_display_name, dbi.release_display_name, a.model_id),
      COALESCE(dbi.release_display_name, mr.release_name),
      COALESCE(dbi.color, '#94A3B8'),
      COALESCE(dbi.release_id, d.release_id)
    ORDER BY model_id ASC, first_decision_at ASC
  `;

  const rows = db.prepare(query).all(...params) as Array<{
    first_decision_at: string;
    model_id: string;
    model_name: string;
    release_name: string;
    color: string;
    release_id: string;
  }>;

  const latestByModel = new Map<string, string>();
  const latestReleaseNameByModel = new Map<string, string>();
  const events: ReleaseChangeEvent[] = [];

  for (const row of rows) {
    const previousReleaseId = latestByModel.get(row.model_id);
    if (!previousReleaseId) {
      latestByModel.set(row.model_id, row.release_id);
      latestReleaseNameByModel.set(row.model_id, row.release_name);
      continue;
    }

    if (previousReleaseId === row.release_id) {
      continue;
    }

    latestByModel.set(row.model_id, row.release_id);
    events.push({
      date: row.first_decision_at,
      model_id: row.model_id,
      model_name: row.model_name,
      previous_release_name: latestReleaseNameByModel.get(row.model_id) ?? row.model_name,
      release_name: row.release_name,
      color: row.color
    });
    latestReleaseNameByModel.set(row.model_id, row.release_name);
  }

  let currentQuery = `
    SELECT
      bc.created_at as config_created_at,
      COALESCE(mf.slug, mf.id) as model_id,
      mf.public_display_name as model_name,
      bcm.release_display_name_snapshot as release_name,
      COALESCE(bcm.color_snapshot, '#94A3B8') as color,
      bcm.release_id as release_id
    FROM benchmark_configs bc
    JOIN benchmark_config_models bcm ON bcm.benchmark_config_id = bc.id
    JOIN model_families mf ON mf.id = bcm.family_id
    WHERE bc.is_default_for_future_cohorts = 1
  `;
  const currentParams: Array<string> = [];

  if (args?.familyId) {
    currentQuery += ' AND bcm.family_id = ?';
    currentParams.push(args.familyId);
  }

  const currentRows = db.prepare(currentQuery).all(...currentParams) as Array<{
    config_created_at: string;
    model_id: string;
    model_name: string;
    release_name: string;
    color: string;
    release_id: string;
  }>;

  for (const row of currentRows) {
    const previousReleaseId = latestByModel.get(row.model_id);
    if (!previousReleaseId || previousReleaseId === row.release_id) {
      continue;
    }

    events.push({
      date: row.config_created_at,
      model_id: row.model_id,
      model_name: row.model_name,
      previous_release_name: latestReleaseNameByModel.get(row.model_id) ?? row.model_name,
      release_name: row.release_name,
      color: row.color
    });
    latestReleaseNameByModel.set(row.model_id, row.release_name);
  }

  return events.sort((left, right) => left.date.localeCompare(right.date));
}

function computePerformanceSeries(
  range: PerformanceTimeRange,
  cohortId: string | null
): Array<Record<string, number | string>> {
  const db = getDb();
  const bucketSeconds = getBucketSeconds(range);
  const params: Array<string | number> = [bucketSeconds, bucketSeconds, bucketSeconds, getRangeStart(range, new Date())];

  let query = `
    WITH filtered_snapshots AS (
      SELECT
        ps.agent_id,
        CAST(unixepoch(ps.snapshot_timestamp) / ? AS INTEGER) * ? as bucket_epoch,
        COALESCE(abi.family_slug, abi.family_id) as family_slug,
        COALESCE(abi.family_display_name, abi.release_display_name, a.model_id) as display_name,
        COALESCE(abi.color, '#94A3B8') as color,
        ps.total_value,
        ROW_NUMBER() OVER (
          PARTITION BY ps.agent_id, CAST(unixepoch(ps.snapshot_timestamp) / ? AS INTEGER)
          ORDER BY ps.snapshot_timestamp DESC
        ) as rn
      FROM portfolio_snapshots ps
      JOIN agents a ON ps.agent_id = a.id
      LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
      WHERE ps.snapshot_timestamp >= ?
  `;

  if (cohortId) {
    query += ' AND a.cohort_id = ?';
    params.push(cohortId);
  }

  query += `
    ),
    bucketed_family_snapshots AS (
      SELECT
        datetime(bucket_epoch, 'unixepoch') as snapshot_timestamp,
        family_slug,
        display_name,
        color,
        AVG(total_value) as total_value
      FROM filtered_snapshots
      WHERE rn = 1
      -- Downsample to a bucketed family-level series so chart payloads stay small
      -- and the API does not have to ship every per-agent snapshot to the browser.
      GROUP BY bucket_epoch, family_slug, display_name, color
    )
    SELECT
      snapshot_timestamp,
      family_slug,
      display_name,
      color,
      total_value
    FROM bucketed_family_snapshots
  `;
  query += ' ORDER BY snapshot_timestamp ASC, display_name ASC';

  const rows = db.prepare(query).all(...params) as Array<{
    snapshot_timestamp: string;
    family_slug: string;
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

    if (dateData[row.family_slug] === undefined) {
      dateData[row.family_slug] = row.total_value;
      counts[row.family_slug] = 1;
    } else {
      dateData[row.family_slug] = (dateData[row.family_slug] as number) + row.total_value;
      counts[row.family_slug] = (counts[row.family_slug] || 1) + 1;
    }
  }

  dataByDate.forEach((dateData, timestamp) => {
    const counts = countsByDate.get(timestamp)!;
    Object.keys(counts).forEach((familySlug) => {
      if (counts[familySlug] > 1) {
        dateData[familySlug] = (dateData[familySlug] as number) / counts[familySlug];
      }
    });
  });

  return Array.from(dataByDate.values());
}

export function refreshPersistedPerformanceCache(): void {
  const ranges: PerformanceTimeRange[] = ['10M', '1H', '1D', '1W', '1M', '3M', 'ALL'];
  const now = Date.now();

  for (const range of ranges) {
    const series = computePerformanceSeries(range, null);
    writePersistedPerformanceData(range, null, series);
    performanceCache.set(buildPerformanceCacheKey(range, null), {
      expiresAt: now + PERFORMANCE_CACHE_TTL_MS,
      data: {
        data: series,
        models: getPublicCatalogModels(),
        release_changes: getReleaseChangeEvents({ cohortId: null }),
        range,
        updated_at: new Date(now).toISOString()
      }
    });
  }
}

export function getPerformanceData(rawRange: string | null, cohortId: string | null): PerformancePayload {
  const range = normalizeRange(rawRange);
  const cacheKey = buildPerformanceCacheKey(range, cohortId);
  const now = new Date();
  const nowMs = now.getTime();
  const cached = performanceCache.get(cacheKey);
  if (cached && cached.expiresAt > nowMs) {
    return cached.data;
  }

  const dataPoints = readPersistedPerformanceData(range, cohortId) ?? computePerformanceSeries(range, cohortId);
  if (!cohortId) {
    writePersistedPerformanceData(range, cohortId, dataPoints);
  }

  const data = {
    data: dataPoints,
    models: getPublicCatalogModels(),
    release_changes: getReleaseChangeEvents({ cohortId }),
    range,
    updated_at: now.toISOString()
  };

  performanceCache.set(cacheKey, {
    expiresAt: nowMs + PERFORMANCE_CACHE_TTL_MS,
    data
  });

  return data;
}
