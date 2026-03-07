import { formatSignedPercent } from '@/lib/format/display';
import type { AgentCohortData } from '@/features/cohorts/model-detail/types';
import { formatAgentCohortDate } from '@/features/cohorts/model-detail/utils';

interface AgentOverviewPanelsProps {
  cohortId: string;
  data: AgentCohortData;
}

export function AgentOverviewPanels({ cohortId, data }: AgentOverviewPanelsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Cohort #{data.cohort.cohort_number} Context</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Status</p>
            <span className={`badge ${data.cohort.status === 'active' ? 'badge-active' : 'badge-completed'}`}>
              {data.cohort.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Started</p>
            <p className="font-medium">{formatAgentCohortDate(data.cohort.started_at)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Current Week</p>
            <p className="font-medium">{data.cohort.current_week}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Markets Traded</p>
            <p className="font-medium">{data.cohort.total_markets}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">{data.model.display_name} Rank</p>
            <p className="font-medium">
              {data.agent.rank} of {data.agent.total_agents}
              <span className={data.agent.total_pnl_percent >= 0 ? 'text-positive' : 'text-negative'}>
                {' '}({formatSignedPercent(data.agent.total_pnl_percent)})
              </span>
            </p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-[var(--border-primary)]">
          <a
            href={`/cohorts/${cohortId}`}
            className="text-sm text-[var(--accent-blue)] hover:underline flex items-center gap-1"
          >
            View Full Cohort Leaderboard
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      <div className="lg:col-span-2 glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Performance vs Cohort</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">{data.model.display_name}</span>
              <span className={`font-mono ${data.agent.total_pnl_percent >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatSignedPercent(data.agent.total_pnl_percent)}
              </span>
            </div>
            <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-blue)]"
                style={{ width: `${Math.min(Math.max((data.agent.total_pnl_percent / 20) * 100, 0), 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--text-muted)]">Cohort Average</span>
              <span className="font-mono text-[var(--text-muted)]">
                {formatSignedPercent(data.stats.cohort_avg_pnl_percent)}
              </span>
            </div>
            <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--text-muted)] opacity-30"
                style={{ width: `${Math.min(Math.max((data.stats.cohort_avg_pnl_percent / 20) * 100, 0), 100)}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[var(--border-primary)]">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Cohort Best</p>
              <p className="font-mono text-positive">{formatSignedPercent(data.stats.cohort_best_pnl_percent)}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Cohort Worst</p>
              <p className="font-mono text-negative">{formatSignedPercent(data.stats.cohort_worst_pnl_percent)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
