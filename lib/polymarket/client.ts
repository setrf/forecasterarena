/**
 * Polymarket client facade.
 *
 * Keep this module stable so engine callers can continue importing a single
 * entry point while transport, transformation, and resolution logic stay split
 * by responsibility.
 */

export {
  fetchEventBySlug,
  fetchEvents,
  fetchMarketById,
  fetchMarkets
} from './api';
export {
  checkMultipleResolutions,
  fetchMarketsFromEvents,
  fetchTopMarkets
} from './aggregates';
export { checkResolution } from './resolution';
export { simplifyMarket } from './transformers';
