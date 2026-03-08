import { INITIAL_BALANCE } from '@/lib/constants';
import { getDb } from '@/lib/db';
import {
  getCurrentReleaseForFamily,
  getModelReleasesByFamily,
  resolveModelFamily
} from '@/lib/db/queries';
import {
  buildCohortPerformance,
  buildEquityCurve,
  calculateAverageBrierScore
} from '@/lib/application/models/helpers';
import { getReleaseChangeEvents } from '@/lib/application/performance';
import {
  getAgentsWithCohorts,
  getModelEquitySnapshots,
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
  const agents = getAgentsWithCohorts(db, family.id);
  const cohortPerformance = buildCohortPerformance(agents);
  const totalPnl = cohortPerformance.reduce((sum, cohort) => sum + cohort.total_pnl, 0);
  const totalCapital = cohortPerformance.length * INITIAL_BALANCE;
  const winRateResult = getModelWinRate(db, family.id);

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
      recent_decisions: getRecentModelDecisions(db, family.id),
      equity_curve: buildEquityCurve(getModelEquitySnapshots(db, family.id)),
      release_changes: getReleaseChangeEvents({ familyId: family.id }),
      updated_at: new Date().toISOString()
    }
  };
}
