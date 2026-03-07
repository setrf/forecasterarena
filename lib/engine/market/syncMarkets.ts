import { logSystemEvent } from '@/lib/db';
import { refreshExistingMarketStatuses } from '@/lib/engine/market/refreshStatuses';
import type { SyncMarketsResult } from '@/lib/engine/market/types';
import { upsertTopMarkets } from '@/lib/engine/market/upsertTopMarkets';

export async function syncMarkets(): Promise<SyncMarketsResult> {
  console.log('Starting market sync...');

  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const { added, updated } = await upsertTopMarkets(errors);
    const { statusUpdates } = await refreshExistingMarketStatuses(errors);
    const duration = Date.now() - startTime;

    logSystemEvent('market_sync_complete', {
      markets_added: added,
      markets_updated: updated,
      status_updates: statusUpdates,
      errors: errors.length,
      duration_ms: duration
    });

    console.log(`Market sync complete: ${added} added, ${updated} updated, ${statusUpdates} status updates, ${errors.length} errors`);

    return {
      success: true,
      markets_added: added,
      markets_updated: updated,
      errors,
      duration_ms: duration
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logSystemEvent('market_sync_error', { error: message }, 'error');
    throw error;
  }
}
