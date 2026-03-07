import type { AdminStats } from '@/features/admin/dashboard/types';

interface AdminStatsGridProps {
  stats: AdminStats | null;
}

export function AdminStatsGrid({ stats }: AdminStatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      <div className="stat-card">
        <div className="stat-value">{stats?.active_cohorts ?? '...'}</div>
        <div className="stat-label">Active Cohorts</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats?.total_agents ?? '...'}</div>
        <div className="stat-label">Total Agents</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats?.markets_tracked ?? '...'}</div>
        <div className="stat-label">Markets Tracked</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">
          {stats ? `$${stats.total_api_cost.toFixed(2)}` : '...'}
        </div>
        <div className="stat-label">API Costs (Total)</div>
      </div>
    </div>
  );
}
