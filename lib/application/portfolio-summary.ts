import { INITIAL_BALANCE } from '@/lib/constants';
import { calculateActualPortfolioValue } from '@/lib/db/queries';
import type { PortfolioSnapshot } from '@/lib/types';

export interface AgentPortfolioSummary {
  latestSnapshot: PortfolioSnapshot | null;
  numResolvedBets: number;
  totalPnl: number;
  totalPnlPercent: number;
  totalValue: number;
}

function latestSnapshotFrom(
  snapshotsOrLatest: PortfolioSnapshot[] | PortfolioSnapshot | null | undefined
): PortfolioSnapshot | null {
  if (!snapshotsOrLatest) {
    return null;
  }

  return Array.isArray(snapshotsOrLatest)
    ? snapshotsOrLatest[snapshotsOrLatest.length - 1] ?? null
    : snapshotsOrLatest;
}

export function resolveAgentPortfolioSummary(
  agentId: string,
  snapshotsOrLatest?: PortfolioSnapshot[] | PortfolioSnapshot | null
): AgentPortfolioSummary {
  const latestSnapshot = latestSnapshotFrom(snapshotsOrLatest);
  const totalValue = latestSnapshot?.total_value ?? calculateActualPortfolioValue(agentId);
  const totalPnl = latestSnapshot?.total_pnl ?? (totalValue - INITIAL_BALANCE);

  return {
    latestSnapshot,
    numResolvedBets: latestSnapshot?.num_resolved_bets ?? 0,
    totalPnl,
    totalPnlPercent: latestSnapshot?.total_pnl_percent ?? ((totalPnl / INITIAL_BALANCE) * 100),
    totalValue
  };
}
