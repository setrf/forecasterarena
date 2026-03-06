import { describe, expect, it } from 'vitest';
import { hasLiveCompetitionData } from '@/lib/competition-state';

describe('competition state helpers', () => {
  it('treats traded cohorts as live even when pnl and resolved bets are still zero', () => {
    expect(hasLiveCompetitionData({
      leaderboard: [
        { total_pnl: 0, num_resolved_bets: 0 },
        { total_pnl: 0, num_resolved_bets: 0 }
      ],
      cohorts: [{ total_markets_traded: 10 }]
    })).toBe(true);
  });

  it('stays in preview mode when there are no trades and no resolved outcomes', () => {
    expect(hasLiveCompetitionData({
      leaderboard: [{ total_pnl: 0, num_resolved_bets: 0 }],
      cohorts: [{ total_markets_traded: 0 }]
    })).toBe(false);
  });
});
