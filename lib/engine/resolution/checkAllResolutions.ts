import { logSystemEvent } from '@/lib/db';
import { getClosedMarkets } from '@/lib/db/queries';
import { checkMarketResolution } from '@/lib/engine/resolution/checkMarketResolution';
import type { ResolutionCheckResult } from '@/lib/engine/resolution/types';
import { sleep } from '@/lib/utils';

export async function checkAllResolutions(): Promise<ResolutionCheckResult> {
  console.log('Checking for market resolutions...');

  const result: ResolutionCheckResult = {
    markets_checked: 0,
    markets_resolved: 0,
    positions_settled: 0,
    errors: []
  };

  const closedMarkets = getClosedMarkets();
  console.log(`Found ${closedMarkets.length} closed market(s) to check`);

  for (const market of closedMarkets) {
    try {
      result.markets_checked += 1;

      const marketResult = await checkMarketResolution(market);
      if (marketResult.resolved) {
        result.markets_resolved += 1;
      }

      result.positions_settled += marketResult.positions_settled;
      result.errors.push(
        ...marketResult.errors.map((error) => `Market ${market.id}: ${error}`)
      );

      await sleep(200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Market ${market.id}: ${message}`);
    }
  }

  console.log(
    `Resolution check complete: ` +
    `${result.markets_checked} checked, ${result.markets_resolved} resolved`
  );

  logSystemEvent('resolution_check_complete', {
    markets_checked: result.markets_checked,
    markets_resolved: result.markets_resolved,
    positions_settled: result.positions_settled,
    errors: result.errors.length
  });

  return result;
}
