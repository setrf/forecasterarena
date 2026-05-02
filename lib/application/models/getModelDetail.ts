import { INITIAL_BALANCE } from '@/lib/constants';
import { getDb } from '@/lib/db';
import {
  getCurrentReleaseForFamily,
  getModelReleasesByFamily,
  resolveModelFamily
} from '@/lib/db/queries';
import {
  buildCohortPerformance,
  calculateAverageBrierScore
} from '@/lib/application/models/helpers';
import { getPerformanceData, performanceDataToEquityCurve } from '@/lib/application/performance';
import {
  getAgentsWithCohorts,
  getModelWinRate,
  getRecentModelDecisions
} from '@/lib/application/models/queries';
import type {
  ModelDetailNotFoundResult,
  ModelDetailPayload,
  OkResult
} from '@/lib/application/models/types';

export function getModelDetail(
  familySlugOrLegacyId: string
): OkResult<ModelDetailPayload> | ModelDetailNotFoundResult {
  const family = resolveModelFamily(familySlugOrLegacyId);

  if (!family) {
    return { status: 'not_found', error: 'Model not found' };
  }

  const db = getDb();
  const currentRelease = getCurrentReleaseForFamily(family.id)
    ?? getModelReleasesByFamily(family.id)[0]
    ?? null;
  const allAgents = getAgentsWithCohorts(db, family.id);
  const agents = allAgents.filter((agent) => agent.is_archived !== 1);
  const archivedAgents = allAgents.filter((agent) => agent.is_archived === 1);
  const cohortPerformance = buildCohortPerformance(agents);
  const archivedCohortPerformance = buildCohortPerformance(archivedAgents);
  const totalPnl = cohortPerformance.reduce((sum, cohort) => sum + cohort.total_pnl, 0);
  const totalCapital = cohortPerformance.length * INITIAL_BALANCE;
  const winRateResult = getModelWinRate(db, family.id);
  const chartSeriesKey = family.slug ?? family.id;
  const performance = getPerformanceData('1M', { familyId: family.id });

  return {
    status: 'ok',
    data: {
      model: {
        id: family.slug ?? family.id,
        family_id: family.id,
        slug: family.slug,
        legacy_model_id: family.legacy_model_id,
        display_name: family.public_display_name,
        short_display_name: family.short_display_name,
        provider: family.provider,
        color: family.color,
        current_release_id: currentRelease?.id ?? null,
        current_release_name: currentRelease?.release_name ?? null
      },
      num_cohorts: agents.length,
      total_pnl: totalPnl,
      avg_pnl_percent: totalCapital > 0 ? (totalPnl / totalCapital) * 100 : 0,
      avg_brier_score: calculateAverageBrierScore(cohortPerformance),
      win_rate: winRateResult && winRateResult.total > 0
        ? winRateResult.wins / winRateResult.total
        : null,
      cohort_performance: cohortPerformance,
      archived_cohort_performance: archivedCohortPerformance,
      recent_decisions: getRecentModelDecisions(db, family.id),
      equity_curve: performanceDataToEquityCurve(
        performance.data,
        chartSeriesKey
      ).map((point) => ({
        snapshot_timestamp: point.date,
        total_value: point.value
      })),
      release_changes: performance.release_changes,
      updated_at: new Date().toISOString()
    }
  };
}
