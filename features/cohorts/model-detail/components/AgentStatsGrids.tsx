import { formatRatePercent, formatSignedPercent, formatSignedUsd, formatUsd } from '@/lib/format/display';
import type { AgentCohortData } from '@/features/cohorts/model-detail/types';

interface AgentStatsGridsProps {
  data: AgentCohortData;
}

export function AgentStatsGrids({ data }: AgentStatsGridsProps) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value">
            {formatUsd(data.agent.total_value)}
          </div>
          <div className="stat-label">Portfolio Value</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${data.agent.total_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatSignedUsd(data.agent.total_pnl)}
          </div>
          <div className="stat-label">P/L</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${data.agent.total_pnl_percent >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatSignedPercent(data.agent.total_pnl_percent)}
          </div>
          <div className="stat-label">Return</div>
        </div>
        <div className="stat-card">
          <div className="stat-value font-mono">
            {data.agent.num_resolved_bets}
          </div>
          <div className="stat-label">Resolved Bets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {data.agent.rank} of {data.agent.total_agents}
          </div>
          <div className="stat-label">Rank</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <div className="stat-card">
          <div className="stat-value">{formatUsd(data.agent.cash_balance)}</div>
          <div className="stat-label">Cash Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatUsd(data.agent.total_invested)}</div>
          <div className="stat-label">Invested</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.stats.position_count}</div>
          <div className="stat-label">Positions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.stats.trade_count}</div>
          <div className="stat-label">Trades</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {formatRatePercent(data.stats.win_rate)}
          </div>
          <div className="stat-label">Win Rate</div>
        </div>
      </div>
    </>
  );
}
