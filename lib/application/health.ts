import { ADMIN_PASSWORD, CRON_SECRET, OPENROUTER_API_KEY } from '@/lib/constants';
import { getDb } from '@/lib/db';

export type HealthStatus = 'ok' | 'error';

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
}

export interface HealthReport {
  status: HealthStatus;
  timestamp: string;
  checks: Record<string, HealthCheckResult>;
}

interface HealthReportDependencies {
  getDb?: typeof getDb;
  configuredSecrets?: Array<string | undefined>;
  now?: () => Date;
}

function errorCheck(message: string): HealthCheckResult {
  return { status: 'error', message };
}

export function getHealthReport(
  dependencies: HealthReportDependencies = {}
): HealthReport {
  const resolveDb = dependencies.getDb ?? getDb;
  const configuredSecrets = dependencies.configuredSecrets ?? [
    OPENROUTER_API_KEY,
    CRON_SECRET,
    ADMIN_PASSWORD
  ];
  const now = dependencies.now ?? (() => new Date());
  const checks: Record<string, HealthCheckResult> = {};
  let overallStatus: HealthStatus = 'ok';

  try {
    const db = resolveDb();
    const result = db.prepare('SELECT 1 as test').get() as { test: number };

    checks.database = {
      status: result.test === 1 ? 'ok' : 'error',
      message: result.test === 1 ? undefined : 'Database query failed'
    };

    if (checks.database.status === 'error') {
      overallStatus = 'error';
    }
  } catch {
    checks.database = errorCheck('Database unavailable');
    overallStatus = 'error';
  }

  const missingCount = configuredSecrets.filter((value) => !value).length;
  checks.environment = {
    status: missingCount === 0 ? 'ok' : 'error',
    message: missingCount > 0 ? 'Required configuration is incomplete' : undefined
  };

  if (checks.environment.status === 'error') {
    overallStatus = 'error';
  }

  try {
    const db = resolveDb();
    const orphanedPositions = db.prepare(`
      SELECT COUNT(*) as count
      FROM positions p
      LEFT JOIN agents a ON p.agent_id = a.id
      WHERE a.id IS NULL
    `).get() as { count: number };

    checks.data_integrity = {
      status: orphanedPositions.count === 0 ? 'ok' : 'error',
      message: orphanedPositions.count > 0 ? 'Integrity issues detected' : undefined
    };

    if (checks.data_integrity.status === 'error') {
      overallStatus = 'error';
    }
  } catch {
    checks.data_integrity = errorCheck('Integrity check unavailable');
    overallStatus = 'error';
  }

  return {
    status: overallStatus,
    timestamp: now().toISOString(),
    checks
  };
}

export function getHealthHttpStatus(status: HealthStatus): 200 | 503 {
  return status === 'ok' ? 200 : 503;
}
