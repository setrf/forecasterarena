/**
 * Database query facade.
 *
 * Keep this module stable so existing imports and test mocks can continue to
 * target `@/lib/db/queries` while the implementation stays split by domain.
 */

export * from './queries/cohorts';
export * from './queries/models';
export * from './queries/agents';
export * from './queries/markets';
export * from './queries/positions';
export * from './queries/trades';
export * from './queries/decisions';
export * from './queries/snapshots';
export * from './queries/brier-scores';
export * from './queries/costs';
export * from './queries/leaderboard';
export * from './queries/logs';
