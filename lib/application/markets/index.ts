/**
 * Market read-model application services.
 *
 * Public import path preserved as a thin barrel.
 */

export { getMarketDetail } from '@/lib/application/markets/getMarketDetail';
export { listMarkets } from '@/lib/application/markets/listMarkets';
export type {
  ListMarketsInput,
  MarketSortOption
} from '@/lib/application/markets/types';
