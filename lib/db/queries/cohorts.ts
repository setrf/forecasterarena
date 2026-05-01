import { generateId, getDb, withImmediateTransaction } from '../index';
import { DECISION_COHORT_LIMIT, METHODOLOGY_VERSION } from '../../constants';
import {
  getCohortDecisionState,
  getDecisionEligibilityThreshold
} from '@/lib/cohort-decision-state';
import type { Cohort } from '../../types';
import { getDefaultBenchmarkConfig } from '@/lib/db/queries/benchmark-configs';

function getCurrentWeekStart(now: Date = new Date()): Date {
  const dayOfWeek = now.getUTCDay();
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - dayOfWeek);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
}

export function getAllCohorts(limit: number = 100): Cohort[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM cohorts
    ORDER BY started_at DESC
    LIMIT ?
  `).all(limit) as Cohort[];
}

export function getActiveCohorts(): Cohort[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM cohorts
    WHERE status = 'active'
      AND COALESCE(is_archived, 0) = 0
    ORDER BY started_at DESC
  `).all() as Cohort[];
}

export function getActiveCohortsIncludingArchived(): Cohort[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM cohorts
    WHERE status = 'active'
    ORDER BY started_at DESC
  `).all() as Cohort[];
}

export function getDecisionEligibleCohorts(limit: number = DECISION_COHORT_LIMIT): Cohort[] {
  const db = getDb();
  const threshold = getDecisionEligibilityThreshold(getLatestCohortNumber(), limit);

  return db.prepare(`
    SELECT * FROM cohorts
    WHERE status = 'active'
      AND COALESCE(is_archived, 0) = 0
      AND cohort_number >= ?
    ORDER BY cohort_number DESC
  `).all(threshold) as Cohort[];
}

export function getCohortById(id: string): Cohort | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id) as Cohort | undefined;
}

export function getCohortByNumber(cohortNumber: number): Cohort | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM cohorts WHERE cohort_number = ?').get(cohortNumber) as Cohort | undefined;
}

export function getCohortForCurrentWeek(): Cohort | undefined {
  const db = getDb();
  const weekStart = getCurrentWeekStart();

  return db.prepare(`
    SELECT * FROM cohorts
    WHERE started_at = ?
    ORDER BY started_at ASC
    LIMIT 1
  `).get(weekStart.toISOString()) as Cohort | undefined;
}

export function getLatestCohortNumber(): number {
  const db = getDb();
  const result = db.prepare('SELECT MAX(cohort_number) as max FROM cohorts').get() as { max: number | null };
  return result.max || 0;
}

export function getCohortDecisionStateByNumber(
  cohort: Pick<Cohort, 'cohort_number' | 'status'>,
  limit: number = DECISION_COHORT_LIMIT
) {
  return getCohortDecisionState(cohort, getLatestCohortNumber(), limit);
}

export function createCohort(benchmarkConfigId?: string | null): Cohort {
  return withImmediateTransaction(() => {
    const db = getDb();
    const startedAt = getCurrentWeekStart().toISOString();
    const resolvedBenchmarkConfigId = benchmarkConfigId ?? getDefaultBenchmarkConfig()?.id;
    const existing = db.prepare(`
      SELECT * FROM cohorts
      WHERE started_at = ?
      LIMIT 1
    `).get(startedAt) as Cohort | undefined;

    if (existing) {
      return existing;
    }

    if (!resolvedBenchmarkConfigId) {
      throw new Error('No default benchmark config is configured for cohort creation');
    }

    const id = generateId();

    db.prepare(`
      INSERT INTO cohorts (id, cohort_number, started_at, methodology_version, benchmark_config_id)
      VALUES (
        ?,
        COALESCE((SELECT MAX(cohort_number) FROM cohorts), 0) + 1,
        ?,
        ?,
        ?
      )
    `).run(id, startedAt, METHODOLOGY_VERSION, resolvedBenchmarkConfigId);

    return getCohortById(id)!;
  });
}

export function completeCohort(id: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE cohorts
    SET status = 'completed', completed_at = ?
    WHERE id = ?
  `).run(now, id);
}

export function getCohortCompletionStatus(cohortId: string): { open_positions: number; total_decisions: number } {
  const db = getDb();
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM positions p
       JOIN agents a ON p.agent_id = a.id
       WHERE a.cohort_id = ? AND p.status = 'open') as open_positions,
      (SELECT COUNT(*) FROM decisions d
       JOIN agents a ON d.agent_id = a.id
       WHERE a.cohort_id = ?) as total_decisions
  `).get(cohortId, cohortId) as { open_positions: number; total_decisions: number };
}
