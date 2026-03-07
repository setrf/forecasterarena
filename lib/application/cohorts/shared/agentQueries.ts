/**
 * Agent-scoped cohort read-model queries.
 *
 * Public import path preserved as a thin barrel.
 */

export {
  getAgentOpenPositionCount,
  getAgentTradeCount
} from '@/lib/application/cohorts/shared/agentQueries/counts';
export {
  getAgentRank,
  getAgentWinRate
} from '@/lib/application/cohorts/shared/agentQueries/rankings';
export { getAgentDecisionsWithMarkets } from '@/lib/application/cohorts/shared/agentQueries/decisions';
export { getAgentTrades } from '@/lib/application/cohorts/shared/agentQueries/trades';
