import { syncMarkets } from '@/lib/engine/market';
import { errorMessage, failure, ok, type CronAppResult } from '@/lib/application/cron/types';

type SyncMarketsSuccess = Awaited<ReturnType<typeof syncMarkets>>;

export async function runMarketSync(): Promise<CronAppResult<SyncMarketsSuccess>> {
  try {
    return ok(await syncMarkets());
  } catch (error) {
    return failure(500, errorMessage(error));
  }
}
