import { getPublicCatalogModels } from '@/lib/catalog/public';
import { getDb, logSystemEvent } from '@/lib/db';
import {
  getReleaseChangeEvents,
  type ReleaseChangeEvent
} from '@/lib/application/performance-release-changes';
import { getRangeStartForLatestSnapshot } from '@/lib/application/performance-range';

export type PerformanceTimeRange = '10M' | '1H' | '1D' | '1W' | '1M' | '3M' | 'ALL';
export { getReleaseChangeEvents, type ReleaseChangeEvent };

export interface PerformancePayload {
  data: Array<Record<string, number | string>>;
  models: ReturnType<typeof getPublicCatalogModels>;
  release_changes: ReleaseChangeEvent[];
  range: PerformanceTimeRange;
  updated_at: string;
}

export interface PerformanceScope {
  cohortId?: string | null;
  familyId?: string | null;
}

export interface PerformanceDiagnostics {
  cache: 'memory-hit' | 'persisted-hit' | 'miss' | 'scoped';
  query_ms: number;
  total_ms: number;
  points: number;
  bytes: number;
}

export interface PerformanceResult {
  payload: PerformancePayload;
  diagnostics: PerformanceDiagnostics;
}

export {
  performanceDataToEquityCurve,
  performanceDataToEquityCurves,
  type EquityCurvePoint
} from '@/lib/application/performance-transforms';

const VALID_RANGES = new Set<PerformanceTimeRange>(['10M', '1H', '1D', '1W', '1M', '3M', 'ALL']);
const MEMORY_CACHE_TTL_MS = 60_000;
const SLOW_CHART_GENERATION_MS = 500;

const performanceCache = new Map<string, {
  expiresAt: number;
  data: PerformancePayload;
  diagnostics: Omit<PerformanceDiagnostics, 'cache' | 'total_ms' | 'bytes'>;
}>();

interface PersistedPerformanceData {
  payload: PerformancePayload;
  generatedAt: string;
  legacyArrayPayload: boolean;
}

function normalizeRange(rawRange: string | null): PerformanceTimeRange {
  return VALID_RANGES.has(rawRange as PerformanceTimeRange)
    ? rawRange as PerformanceTimeRange
    : '1M';
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

function normalizeScope(scopeOrCohortId?: PerformanceScope | string | null): Required<PerformanceScope> {
  if (typeof scopeOrCohortId === 'string' || scopeOrCohortId === null) {
    return {
      cohortId: scopeOrCohortId ?? null,
      familyId: null
    };
  }

  return {
    cohortId: scopeOrCohortId?.cohortId ?? null,
    familyId: scopeOrCohortId?.familyId ?? null
  };
}

function hasScopeFilters(scope: Required<PerformanceScope>): boolean {
  return Boolean(scope.cohortId || scope.familyId);
}

function buildPerformanceCacheKey(
  range: PerformanceTimeRange,
  scope: Required<PerformanceScope>
): string {
  if (!hasScopeFilters(scope)) {
    return `${range}::all`;
  }

  return `${range}::cohort=${scope.cohortId ?? 'all'}::family=${scope.familyId ?? 'all'}`;
}

function parseSqliteUtcTimestamp(timestamp: string): number | null {
  const parsed = Date.parse(timestamp.includes('T') ? timestamp : `${timestamp.replace(' ', 'T')}Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

function isPerformancePayload(value: unknown): value is PerformancePayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PerformancePayload>;
  return Array.isArray(candidate.data) &&
    Array.isArray(candidate.models) &&
    Array.isArray(candidate.release_changes) &&
    typeof candidate.range === 'string' &&
    typeof candidate.updated_at === 'string';
}

function readPersistedPerformanceData(
  range: PerformanceTimeRange,
  scope: Required<PerformanceScope>
): PersistedPerformanceData | null {
  if (hasScopeFilters(scope)) {
    return null;
  }

  const db = getDb();
  const row = db.prepare(`
    SELECT payload_json, generated_at
    FROM performance_chart_cache
    WHERE cache_key = ?
    LIMIT 1
  `).get(buildPerformanceCacheKey(range, scope)) as
    | { payload_json: string; generated_at: string }
    | undefined;

  if (!row?.payload_json) {
    return null;
  }

  try {
    const parsed = JSON.parse(row.payload_json);
    if (isPerformancePayload(parsed)) {
      return {
        payload: {
          ...parsed,
          range,
          updated_at: toIsoUtc(row.generated_at)
        },
        generatedAt: row.generated_at,
        legacyArrayPayload: false
      };
    }

    if (Array.isArray(parsed)) {
      return {
        payload: {
          data: parsed as Array<Record<string, number | string>>,
          models: getModelsForScope(scope),
          release_changes: getReleaseChangeEvents(scope),
          range,
          updated_at: toIsoUtc(row.generated_at)
        },
        generatedAt: row.generated_at,
        legacyArrayPayload: true
      };
    }

    return null;
  } catch {
    return null;
  }
}

function writePersistedPerformanceData(
  range: PerformanceTimeRange,
  scope: Required<PerformanceScope>,
  payload: PerformancePayload
): void {
  if (hasScopeFilters(scope)) {
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
    buildPerformanceCacheKey(range, scope),
    null,
    range,
    JSON.stringify(payload)
  );
}

function getModelsForScope(scope: Required<PerformanceScope>): ReturnType<typeof getPublicCatalogModels> {
  const models = getPublicCatalogModels();
  if (!scope.familyId) {
    return models;
  }

  return models.filter((model) => (
    model.family_id === scope.familyId ||
    model.id === scope.familyId ||
    model.slug === scope.familyId ||
    model.legacy_model_id === scope.familyId
  ));
}

function toIsoUtc(timestamp: string): string {
  const parsedAt = parseSqliteUtcTimestamp(timestamp);
  return parsedAt === null ? new Date().toISOString() : new Date(parsedAt).toISOString();
}

function getPayloadByteSize(payload: PerformancePayload): number {
  return Buffer.byteLength(JSON.stringify(payload));
}

function logPerformanceEvent(
  eventType: string,
  eventData: Record<string, unknown>,
  severity: 'info' | 'warning' | 'error' = 'info'
): void {
  try {
    logSystemEvent(eventType, eventData, severity);
  } catch (error) {
    console.warn(`Failed to record ${eventType}`, error);
  }
}

function computePerformanceSeries(
  range: PerformanceTimeRange,
  scope: Required<PerformanceScope>
): Array<Record<string, number | string>> {
  const db = getDb();
  const bucketSeconds = getBucketSeconds(range);
  const params: Array<string | number | null> = [
    scope.cohortId,
    scope.cohortId,
    scope.familyId,
    scope.familyId,
    scope.cohortId,
    bucketSeconds,
    bucketSeconds,
    bucketSeconds,
    getRangeStartForLatestSnapshot(range, scope)
  ];

  let query = `
    WITH scoped_agents AS (
      SELECT
        a.id,
        COALESCE(abi.family_slug, abi.family_id, a.family_id, a.model_id) as family_slug,
        COALESCE(abi.family_display_name, abi.release_display_name, a.model_id) as display_name,
        COALESCE(abi.color, '#94A3B8') as color
      FROM agents a
      JOIN cohorts c ON c.id = a.cohort_id
      LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
      WHERE (? IS NULL OR a.cohort_id = ?)
        AND (? IS NULL OR a.family_id = ?)
        AND (? IS NOT NULL OR COALESCE(c.is_archived, 0) = 0)
    ),
    filtered_snapshots AS (
      SELECT
        ps.agent_id,
        CAST(unixepoch(ps.snapshot_timestamp) / ? AS INTEGER) * ? as bucket_epoch,
        sa.family_slug,
        sa.display_name,
        sa.color,
        ps.total_value,
        ROW_NUMBER() OVER (
          PARTITION BY ps.agent_id, CAST(unixepoch(ps.snapshot_timestamp) / ? AS INTEGER)
          ORDER BY ps.snapshot_timestamp DESC
        ) as rn
      FROM portfolio_snapshots ps INDEXED BY idx_snapshots_timestamp_agent_value
      JOIN scoped_agents sa ON ps.agent_id = sa.id
      WHERE ps.snapshot_timestamp >= ?
  `;

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
  const scope = normalizeScope(null);

  for (const range of ranges) {
    const startedAt = performance.now();
    const now = Date.now();
    const series = computePerformanceSeries(range, scope);
    const queryMs = performance.now() - startedAt;
    const payload = {
      data: series,
      models: getModelsForScope(scope),
      release_changes: getReleaseChangeEvents(scope),
      range,
      updated_at: new Date(now).toISOString()
    };
    writePersistedPerformanceData(range, scope, payload);
    performanceCache.set(buildPerformanceCacheKey(range, scope), {
      expiresAt: now + MEMORY_CACHE_TTL_MS,
      data: payload,
      diagnostics: {
        query_ms: queryMs,
        points: series.length
      }
    });

    logPerformanceEvent('performance_chart_cache_refreshed', {
      range,
      points: series.length,
      duration_ms: Math.round(queryMs)
    });
  }
}

export function getPerformanceDataWithDiagnostics(
  rawRange: string | null,
  scopeOrCohortId?: PerformanceScope | string | null
): PerformanceResult {
  const startedAt = performance.now();
  const range = normalizeRange(rawRange);
  const scope = normalizeScope(scopeOrCohortId);
  const cacheKey = buildPerformanceCacheKey(range, scope);
  const now = new Date();
  const nowMs = now.getTime();
  const cached = performanceCache.get(cacheKey);
  if (cached && cached.expiresAt > nowMs) {
    const totalMs = performance.now() - startedAt;
    const bytes = getPayloadByteSize(cached.data);
    return {
      payload: cached.data,
      diagnostics: {
        cache: 'memory-hit',
        query_ms: cached.diagnostics.query_ms,
        total_ms: totalMs,
        points: cached.diagnostics.points,
        bytes
      }
    };
  }

  const persisted = readPersistedPerformanceData(range, scope);
  if (persisted) {
    const payload = persisted.payload;
    const totalMs = performance.now() - startedAt;
    const bytes = getPayloadByteSize(payload);

    if (persisted.legacyArrayPayload) {
      writePersistedPerformanceData(range, scope, payload);
    }

    performanceCache.set(cacheKey, {
      expiresAt: nowMs + MEMORY_CACHE_TTL_MS,
      data: payload,
      diagnostics: {
        query_ms: 0,
        points: payload.data.length
      }
    });

    return {
      payload,
      diagnostics: {
        cache: 'persisted-hit',
        query_ms: 0,
        total_ms: totalMs,
        points: payload.data.length,
        bytes
      }
    };
  }

  const queryStartedAt = performance.now();
  const dataPoints = computePerformanceSeries(range, scope);
  const queryMs = performance.now() - queryStartedAt;

  const data: PerformancePayload = {
    data: dataPoints,
    models: getModelsForScope(scope),
    release_changes: getReleaseChangeEvents(scope),
    range,
    updated_at: now.toISOString()
  };

  performanceCache.set(cacheKey, {
    expiresAt: nowMs + MEMORY_CACHE_TTL_MS,
    data,
    diagnostics: {
      query_ms: queryMs,
      points: dataPoints.length
    }
  });
  if (!hasScopeFilters(scope)) {
    writePersistedPerformanceData(range, scope, data);
  }

  const totalMs = performance.now() - startedAt;
  const bytes = getPayloadByteSize(data);
  if (queryMs > SLOW_CHART_GENERATION_MS) {
    logPerformanceEvent('performance_chart_slow', {
      range,
      cohort_id: scope.cohortId,
      family_id: scope.familyId,
      cache: hasScopeFilters(scope) ? 'scoped' : 'miss',
      points: dataPoints.length,
      bytes,
      query_ms: Math.round(queryMs),
      total_ms: Math.round(totalMs)
    }, 'warning');
  }

  return {
    payload: data,
    diagnostics: {
      cache: hasScopeFilters(scope) ? 'scoped' : 'miss',
      query_ms: queryMs,
      total_ms: totalMs,
      points: dataPoints.length,
      bytes
    }
  };
}

export function getPerformanceData(
  rawRange: string | null,
  scopeOrCohortId?: PerformanceScope | string | null
): PerformancePayload {
  return getPerformanceDataWithDiagnostics(rawRange, scopeOrCohortId).payload;
}
