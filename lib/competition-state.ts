interface LeaderboardLikeEntry {
  total_pnl?: number | null;
  num_resolved_bets?: number | null;
}

interface CohortLikeSummary {
  total_markets_traded?: number | null;
}

export function hasLiveCompetitionData(args: {
  leaderboard?: LeaderboardLikeEntry[] | null;
  cohorts?: CohortLikeSummary[] | null;
}): boolean {
  const leaderboard = args.leaderboard ?? [];
  const cohorts = args.cohorts ?? [];

  if (
    leaderboard.some((entry) => (entry.total_pnl ?? 0) !== 0 || (entry.num_resolved_bets ?? 0) > 0)
  ) {
    return true;
  }

  return cohorts.some((cohort) => (cohort.total_markets_traded ?? 0) > 0);
}
