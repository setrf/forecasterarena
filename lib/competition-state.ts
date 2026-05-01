interface LeaderboardLikeEntry {
  total_pnl?: number | null;
  num_resolved_bets?: number | null;
}

interface CohortLikeSummary {
  total_markets_traded?: number | null;
  is_archived?: boolean | number | null;
  scoring_status?: string | null;
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

  return cohorts.some((cohort) => (
    cohort.scoring_status !== 'archived' &&
    cohort.is_archived !== true &&
    cohort.is_archived !== 1 &&
    (cohort.total_markets_traded ?? 0) > 0
  ));
}
