'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import PerformanceChart from '@/components/charts/PerformanceChart';
import DecisionFeed from '@/components/DecisionFeed';
import { MODELS } from '@/lib/constants';
import TimeRangeSelector, { TimeRange } from '@/components/charts/TimeRangeSelector';

interface Cohort {
  id: string;
  cohort_number: number;
  started_at: string;
  status: string;
  completed_at: string | null;
  methodology_version: string;
  initial_balance: number;
}

interface AgentStats {
  id: string;
  model_id: string;
  model_display_name: string;
  model_color: string;
  cash_balance: number;
  total_invested: number;
  status: string;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  brier_score: number | null;
  position_count: number;
  trade_count: number;
  num_resolved_bets: number;
}

interface CohortStats {
  week_number: number;
  total_trades: number;
  total_positions_open: number;
  markets_with_positions: number;
  avg_brier_score: number | null;
}

interface Decision {
  id: string;
  agent_id: string;
  cohort_id: string;
  decision_week: number;
  decision_timestamp: string;
  action: string;
  reasoning: string | null;
  model_display_name: string;
  model_color: string;
  cohort_number?: number;
}

export default function CohortDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [equityCurves, setEquityCurves] = useState<Record<string, Array<{ date: string; value: number }>>>({});
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/cohorts/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Cohort not found');
          } else {
            setError('Failed to load cohort');
          }
          return;
        }
        const data = await res.json();
        setCohort(data.cohort);
        setAgents(data.agents);
        setStats(data.stats);
        setEquityCurves(data.equity_curves);
        setDecisions(data.recent_decisions);
      } catch (err) {
        setError('Failed to load cohort');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // Transform equity curves for chart
  const chartData = useMemo(() => {
    if (Object.keys(equityCurves).length === 0) return [];

    // Get all unique dates
    const allDates = new Set<string>();
    Object.values(equityCurves).forEach(curve => {
      curve.forEach(point => allDates.add(point.date));
    });

    // Build chart data
    return Array.from(allDates).sort().map(date => {
      const point: { date: string;[modelId: string]: string | number } = { date };
      Object.entries(equityCurves).forEach(([modelId, curve]) => {
        const dataPoint = curve.find(p => p.date === date);
        point[modelId] = dataPoint?.value || 10000;
      });
      return point;
    });
  }, [equityCurves]);

  const modelConfigs = MODELS.map(m => ({
    id: m.id,
    name: m.displayName,
    color: m.color
  }));

  if (loading) {
    return (
      <div className="container-wide mx-auto px-6 py-20 text-center text-[var(--text-muted)]">
        Loading cohort...
      </div>
    );
  }

  if (error || !cohort) {
    return (
      <div className="container-wide mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">{error || 'Cohort Not Found'}</h1>
        <a href="/cohorts" className="btn btn-primary">
          Back to Cohorts
        </a>
      </div>
    );
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function formatPnL(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${formatCurrency(value)}`;
  }

  function formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  return (
    <div className="container-wide mx-auto px-6 py-12">
      {/* Back link */}
      <a href="/cohorts" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to cohorts
      </a>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Cohort #{cohort.cohort_number}</h1>
        <span className={`badge ${cohort.status === 'active' ? 'badge-active' : 'badge-completed'}`}>
          {cohort.status}
        </span>
        <span className="text-[var(--text-muted)]">
          {cohort.methodology_version}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value">Week {stats?.week_number || 1}</div>
          <div className="stat-label">Current Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_trades || 0}</div>
          <div className="stat-label">Total Trades</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_positions_open || 0}</div>
          <div className="stat-label">Open Positions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.markets_with_positions || 0}</div>
          <div className="stat-label">Markets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value font-mono">
            {stats?.avg_brier_score?.toFixed(4) || 'N/A'}
          </div>
          <div className="stat-label">Avg Brier</div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="chart-container mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold">Portfolio Performance</h3>
          <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
        </div>
        <PerformanceChart
          data={chartData}
          models={modelConfigs}
          height={350}
          showLegend={true}
          timeRange={timeRange}
        />
      </div>

      {/* Leaderboard */}
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
              {agents.map((agent, i) => (
                <tr
                  key={agent.id}
                  onClick={() => window.location.href = `/cohorts/${id}/models/${agent.model_id}`}
                  className="cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
                  title={`View ${agent.model_display_name}'s performance in this cohort`}
                >
                  <td className="text-[var(--text-muted)]">{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: agent.model_color }}
                      />
                      <span>{agent.model_display_name}</span>
                      {agent.status === 'bankrupt' && (
                        <span className="text-xs text-[var(--accent-rose)]">BANKRUPT</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right font-mono">{formatCurrency(agent.cash_balance)}</td>
                  <td className="text-right font-mono">{formatCurrency(agent.total_invested)}</td>
                  <td className="text-right font-mono font-medium">{formatCurrency(agent.total_value)}</td>
                  <td className="text-right font-mono">
                    <span className={agent.total_pnl >= 0 ? 'text-positive' : 'text-negative'}>
                      {formatPnL(agent.total_pnl)}
                    </span>
                  </td>
                  <td className="text-right font-mono">
                    <span className={agent.total_pnl_percent >= 0 ? 'text-positive' : 'text-negative'}>
                      {formatPercent(agent.total_pnl_percent)}
                    </span>
                  </td>
                  <td className="text-right font-mono hidden md:table-cell">
                    {agent.brier_score?.toFixed(4) || 'N/A'}
                  </td>
                  <td className="text-right hidden lg:table-cell text-[var(--text-muted)]">
                    {agent.trade_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Decisions */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Decisions</h2>
        {decisions.length === 0 ? (
          <p className="text-[var(--text-muted)] text-center py-8">
            No decisions yet. Decisions are made every Sunday at 00:00 UTC.
          </p>
        ) : (
          <DecisionFeed decisions={decisions} showCohort={false} />
        )}
      </div>

      {/* Info */}
      <div className="mt-8 text-center text-sm text-[var(--text-muted)]">
        Started {formatDate(cohort.started_at)}
        {cohort.completed_at && ` • Completed ${formatDate(cohort.completed_at)}`}
      </div>
    </div>
  );
}

