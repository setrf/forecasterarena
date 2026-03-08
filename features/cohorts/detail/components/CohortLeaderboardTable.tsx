import type { KeyboardEvent } from 'react';
import { formatDecimal, formatSignedPercent, formatSignedUsd, formatUsd } from '@/lib/format/display';
import type { AgentStats } from '@/features/cohorts/detail/types';

interface CohortLeaderboardTableProps {
  cohortId: string;
  agents: AgentStats[];
  onNavigate: (href: string) => void;
}

export function CohortLeaderboardTable({
  cohortId,
  agents,
  onNavigate
}: CohortLeaderboardTableProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>, href: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onNavigate(href);
    }
  }

  return (
    <div className="glass-card p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">Leaderboard</h2>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Model</th>
              <th className="text-right">Cash</th>
              <th className="text-right">Invested</th>
              <th className="text-right">Total Value</th>
              <th className="text-right">P/L</th>
              <th className="text-right">Return</th>
              <th className="text-right hidden md:table-cell">Brier</th>
              <th className="text-right hidden lg:table-cell">Trades</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, index) => {
              const href = `/cohorts/${cohortId}/models/${agent.family_slug}`;

              return (
                <tr
                  key={agent.id}
                  onClick={() => onNavigate(href)}
                  onKeyDown={(event) => handleKeyDown(event, href)}
                  role="link"
                  tabIndex={0}
                  className="cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
                  title={`View ${agent.model_display_name}'s performance in this cohort`}
                >
                  <td className="text-[var(--text-muted)]">{index + 1}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: agent.model_color }}
                      />
                      <div className="flex flex-col">
                        <span>{agent.model_display_name}</span>
                        {agent.model_release_name && agent.model_release_name !== agent.model_display_name && (
                          <span className="text-xs text-[var(--text-muted)]">
                            {agent.model_release_name}
                          </span>
                        )}
                      </div>
                      {agent.status === 'bankrupt' && (
                        <span className="text-xs text-[var(--accent-rose)]">BANKRUPT</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right font-mono">{formatUsd(agent.cash_balance)}</td>
                  <td className="text-right font-mono">{formatUsd(agent.total_invested)}</td>
                  <td className="text-right font-mono font-medium">{formatUsd(agent.total_value)}</td>
                  <td className="text-right font-mono">
                    <span className={agent.total_pnl >= 0 ? 'text-positive' : 'text-negative'}>
                      {formatSignedUsd(agent.total_pnl)}
                    </span>
                  </td>
                  <td className="text-right font-mono">
                    <span className={agent.total_pnl_percent >= 0 ? 'text-positive' : 'text-negative'}>
                      {formatSignedPercent(agent.total_pnl_percent)}
                    </span>
                  </td>
                  <td className="text-right font-mono hidden md:table-cell">
                    {formatDecimal(agent.brier_score)}
                  </td>
                  <td className="text-right hidden lg:table-cell text-[var(--text-muted)]">
                    {agent.trade_count}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
