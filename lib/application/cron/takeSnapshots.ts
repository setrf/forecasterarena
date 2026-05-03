import { logSystemEvent } from '@/lib/db';
import { getAgentsByCohort } from '@/lib/db/queries/agents';
import { getActiveCohorts } from '@/lib/db/queries/cohorts';
import { nowTimestamp } from '@/lib/utils';
import { refreshPersistedPerformanceCache } from '@/lib/application/performance';
import {
  collectSnapshotPortfolioInputs,
  createAgentPortfolioSnapshot
} from '@/lib/application/cron/snapshotPortfolio';
import { recordMarketPriceSnapshots } from '@/lib/application/cron/snapshotProvenance';
import { errorMessage, failure, ok, type CronAppResult } from '@/lib/application/cron/types';
import { getValidatedMarketPrices } from '@/lib/pricing/marketPrices';

type SnapshotJobSuccess = {
  success: true;
  snapshots_taken: number;
  positions_updated: number;
  errors: number;
  duration_ms: number;
};

export async function takeSnapshots(): Promise<CronAppResult<SnapshotJobSuccess>> {
  try {
    console.log('Taking portfolio snapshots...');

    const startTime = Date.now();
    const snapshotTimestamp = nowTimestamp();
    let snapshotsTaken = 0;
    let positionsUpdated = 0;
    const errors: string[] = [];
    const activeAgents = getActiveCohorts().flatMap((cohort) => getAgentsByCohort(cohort.id));
    const { marketsById, positionsByAgentId } = collectSnapshotPortfolioInputs(activeAgents);

    const marketPrices = await getValidatedMarketPrices(Array.from(marketsById.values()));
    recordMarketPriceSnapshots(Array.from(marketsById.values()), snapshotTimestamp, marketPrices);

    for (const agent of activeAgents) {
      try {
        const result = createAgentPortfolioSnapshot(
          agent,
          snapshotTimestamp,
          positionsByAgentId.get(agent.id) ?? [],
          marketPrices
        );
        positionsUpdated += result.positionsUpdated;
        snapshotsTaken++;
      } catch (error) {
        errors.push(`Agent ${agent.id}: ${errorMessage(error)}`);
      }
    }

    refreshPersistedPerformanceCache();

    const duration = Date.now() - startTime;

    logSystemEvent('snapshots_taken', {
      snapshots: snapshotsTaken,
      positions_updated: positionsUpdated,
      errors: errors.length,
      duration_ms: duration
    });

    console.log(
      `Snapshots complete: ${snapshotsTaken} snapshots, ${positionsUpdated} positions updated`
    );

    return ok({
      success: true,
      snapshots_taken: snapshotsTaken,
      positions_updated: positionsUpdated,
      errors: errors.length,
      duration_ms: duration
    });
  } catch (error) {
    const message = errorMessage(error);
    logSystemEvent('take_snapshots_error', { error: message }, 'error');
    return failure(500, message);
  }
}
