'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import PerformanceChart from '@/components/charts/PerformanceChart';
import TimeRangeSelector, { TimeRange } from '@/components/charts/TimeRangeSelector';

interface Cohort {
  id: string;
  cohort_number: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  current_week: number;
  total_markets: number;
}

interface Model {
  id: string;
  display_name: string;
  provider: string;
  color: string;
}

interface Agent {
  id: string;
  status: string;
  cash_balance: number;
  total_invested: number;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  brier_score: number | null;
  num_resolved_bets: number;
  rank: number;
  total_agents: number;
}

interface Stats {
  position_count: number;
  trade_count: number;
  win_rate: number | null;
  cohort_avg_pnl_percent: number;
  cohort_best_pnl_percent: number;
  cohort_worst_pnl_percent: number;
}

interface EquityPoint {
  date: string;
  value: number;
}

interface Market {
  trade_type?: string;
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  market_id: string;
  market_question: string;
}

interface Decision {
  id: string;
  decision_week: number;
  decision_timestamp: string;
  action: string;
  reasoning: string | null;
  markets: Market[];
}

interface Position {
  id: string;
  market_id: string;
  market_question: string;
  side: string;
  shares: number;
  avg_entry_price: number;
  current_price: number;
  current_value?: number;
  unrealized_pnl?: number;
  status: string;
  opening_decision_id?: string;
}

interface ClosedPosition {
  id: string;
  market_id: string;
  market_question: string;
  side: string;
  shares: number;
  avg_entry_price: number;
  total_cost: number;
  position_status: string;
  market_status: string;
  resolution_outcome: string | null;
  outcome: 'WON' | 'LOST' | 'EXITED' | 'CANCELLED' | 'PENDING' | 'UNKNOWN';
  settlement_value: number | null;
  pnl: number | null;
  opened_at: string;
  closed_at: string | null;
  resolved_at: string | null;
  opening_decision_id?: string;
}

interface Trade {
  id: string;
  timestamp: string;
  trade_type: string;
  market_id: string;
  market_question: string;
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  decision_week: number;
  decision_id: string;
}

interface AgentCohortData {
  cohort: Cohort;
  model: Model;
  agent: Agent;
  stats: Stats;
  equity_curve: EquityPoint[];
  decisions: Decision[];
  positions: Position[];
  closed_positions: ClosedPosition[];
  trades: Trade[];
}

export default function AgentCohortDetailPage() {
  const params = useParams<{ id: string; modelId: string }>();
  const cohortId = params.id;
  const modelId = params.modelId;

  const [data, setData] = useState<AgentCohortData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1W');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/cohorts/${cohortId}/models/${modelId}`);
        if (!res.ok) {
          if (res.status === 404) {
            const error = await res.json();
            setError(error.error || 'Not found');
          } else {
            setError('Failed to load data');
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [cohortId, modelId]);

  // Transform equity curve for chart
  const chartData = useMemo(() => {
    if (!data?.equity_curve?.length) return [];
    return data.equity_curve.map(point => ({
      date: point.date,
      [modelId]: point.value
    }));
  }, [data, modelId]);

  const chartModels = data?.model ? [{
    id: data.model.id,
    name: data.model.display_name,
    color: data.model.color
  }] : [];

  if (loading) {
    return (
      <div className="container-wide mx-auto px-6 py-20 text-center text-[var(--text-muted)]">
        Loading...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container-wide mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">{error || 'Not Found'}</h1>
        <p className="text-[var(--text-secondary)] mb-6">
          {error === 'Agent not found in this cohort'
            ? 'This model was not active in this cohort.'
            : 'The page you are looking for does not exist.'}
        </p>
        <a href="/cohorts" className="btn btn-primary">
          Back to Cohorts
        </a>
      </div>
    );
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

  /**
   * Parse UTC timestamp from DB format (YYYY-MM-DD HH:MM:SS) or ISO 8601
   */
  function parseUTCTimestamp(dateStr: string): Date {
    if (dateStr.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }
    return new Date(dateStr.replace(' ', 'T') + 'Z');
  }

  function formatDate(dateStr: string): string {
    return parseUTCTimestamp(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatDateTime(dateStr: string): string {
    return parseUTCTimestamp(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  return (
    <div className="container-wide mx-auto px-6 py-12">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-6">
        <a href="/cohorts" className="hover:text-[var(--text-primary)] transition-colors">
          Cohorts
        </a>
        <span>›</span>
        <a href={`/cohorts/${cohortId}`} className="hover:text-[var(--text-primary)] transition-colors">
          Cohort #{data.cohort.cohort_number}
        </a>
        <span>›</span>
        <span className="text-[var(--text-primary)]">{data.model.display_name}</span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start gap-6 mb-10">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
          style={{ backgroundColor: data.model.color }}
        >
          {data.model.display_name.substring(0, 2).toUpperCase()}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{data.model.display_name}</h1>
            <span className={`badge ${data.agent.status === 'active' ? 'badge-active' : 'badge-pending'}`}>
              {data.agent.status}
            </span>
            <span className="text-[var(--text-muted)]">Week {data.cohort.current_week}</span>
          </div>
          <p className="text-[var(--text-secondary)]">
            {data.model.provider} • in Cohort #{data.cohort.cohort_number}
          </p>
        </div>
      </div>

      {/* Performance Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value">
            {formatCurrency(data.agent.total_value)}
          </div>
          <div className="stat-label">Portfolio Value</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${data.agent.total_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatPnL(data.agent.total_pnl)}
          </div>
          <div className="stat-label">P/L</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${data.agent.total_pnl_percent >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatPercent(data.agent.total_pnl_percent)}
          </div>
          <div className="stat-label">Return</div>
        </div>
        <div className="stat-card">
          <div className="stat-value font-mono">
            {data.agent.brier_score?.toFixed(4) || 'N/A'}
          </div>
          <div className="stat-label">Brier Score</div>
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
          <div className="stat-value">{formatCurrency(data.agent.cash_balance)}</div>
          <div className="stat-label">Cash Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(data.agent.total_invested)}</div>
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
            {data.stats.win_rate ? `${(data.stats.win_rate * 100).toFixed(1)}%` : 'N/A'}
          </div>
          <div className="stat-label">Win Rate</div>
        </div>
      </div>

      {/* Portfolio Performance Chart */}
      <div className="chart-container mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold">Portfolio Value Over Time</h3>
          <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
        </div>
        <PerformanceChart
          data={chartData}
          models={chartModels}
          height={520}
          showLegend={false}
          timeRange={timeRange}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column - Cohort Context */}
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
              <p className="font-medium">{formatDate(data.cohort.started_at)}</p>
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
                  {' '}({formatPercent(data.agent.total_pnl_percent)})
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

        {/* Right Column - Performance vs Cohort */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Performance vs Cohort</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">{data.model.display_name}</span>
                <span className={`font-mono ${data.agent.total_pnl_percent >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatPercent(data.agent.total_pnl_percent)}
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
                  {formatPercent(data.stats.cohort_avg_pnl_percent)}
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
                <p className="font-mono text-positive">{formatPercent(data.stats.cohort_best_pnl_percent)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Cohort Worst</p>
                <p className="font-mono text-negative">{formatPercent(data.stats.cohort_worst_pnl_percent)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decisions Timeline */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Decision History ({data.decisions.length})
        </h2>

        {data.decisions.length === 0 ? (
          <p className="text-[var(--text-muted)] text-center py-8">
            No decisions yet. Decisions are made every Sunday at 00:00 UTC.
          </p>
        ) : (
          <div className="space-y-4">
            {data.decisions.map((decision) => (
              <div
                key={decision.id}
                className="p-4 bg-[var(--bg-tertiary)] rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`badge ${
                      decision.action === 'BET' ? 'badge-active' :
                      decision.action === 'SELL' ? 'badge-pending' : ''
                    }`}>
                      {decision.action}
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">
                      Week {decision.decision_week}
                    </span>
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">
                    {formatDate(decision.decision_timestamp)}
                  </span>
                </div>

                {decision.markets && decision.markets.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-2">
                      {decision.action === 'BET' ? 'Markets Traded:' : 'Markets:'}
                    </p>
                    <div className="space-y-1">
                      {decision.markets.map((market, idx) => (
                        <div key={idx} className="text-sm flex items-center justify-between">
                          <span className="text-[var(--text-secondary)]">
                            • {market.market_question}
                          </span>
                          <span className="font-mono text-[var(--text-muted)]">
                            {market.side} - {formatCurrency(market.total_amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {decision.reasoning && (
                  <div>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                      {decision.reasoning}
                    </p>
                    {decision.reasoning.length > 150 && (
                      <button
                        onClick={() => setSelectedDecision(decision)}
                        className="text-sm text-[var(--accent-blue)] hover:underline mt-2"
                      >
                        View Full Reasoning →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Positions Tables: Open + Closed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Open Positions */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            Open Positions ({data.stats.position_count})
          </h3>

          {data.positions.length === 0 ? (
            <p className="text-[var(--text-muted)] text-center py-8">
              No open positions
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Side</th>
                    <th className="text-right">Shares</th>
                    <th className="text-right">Entry</th>
                    <th className="text-right">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {data.positions.map((position) => {
                    const currentValue = position.current_value || position.shares * position.current_price;
                    const unrealizedPnl = position.unrealized_pnl || (currentValue - position.shares * position.avg_entry_price);

                    return (
                      <tr
                        key={position.id}
                        onClick={() => position.opening_decision_id && (window.location.href = `/decisions/${position.opening_decision_id}`)}
                        className={position.opening_decision_id ? 'cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors' : ''}
                        title={position.opening_decision_id ? 'Click to view opening decision rationale' : undefined}
                      >
                        <td className="max-w-[200px] truncate" title={position.market_question}>
                          {position.market_question}
                        </td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            position.side === 'YES' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {position.side}
                          </span>
                        </td>
                        <td className="text-right font-mono">{position.shares.toFixed(0)}</td>
                        <td className="text-right font-mono">{(position.avg_entry_price * 100).toFixed(1)}%</td>
                        <td className={`text-right font-mono ${unrealizedPnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {formatPnL(unrealizedPnl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Closed Positions */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            Closed Positions ({data.closed_positions.length})
          </h3>

          {data.closed_positions.length === 0 ? (
            <p className="text-[var(--text-muted)] text-center py-8">
              No closed positions
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Side</th>
                    <th className="text-right">Outcome</th>
                    <th className="text-right">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {data.closed_positions.map((position) => {
                    const pnl = position.pnl || 0;
                    const outcomeColors = {
                      'WON': 'bg-green-500/20 text-green-400',
                      'LOST': 'bg-red-500/20 text-red-400',
                      'EXITED': 'bg-blue-500/20 text-blue-400',
                      'CANCELLED': 'bg-gray-500/20 text-gray-400',
                      'PENDING': 'bg-yellow-500/20 text-yellow-400',
                      'UNKNOWN': 'bg-gray-500/20 text-gray-400'
                    };

                    return (
                      <tr
                        key={position.id}
                        onClick={() => position.opening_decision_id && (window.location.href = `/decisions/${position.opening_decision_id}`)}
                        className={position.opening_decision_id ? 'cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors' : ''}
                        title={position.opening_decision_id ? 'Click to view opening decision rationale' : undefined}
                      >
                        <td className="max-w-[150px] truncate" title={position.market_question}>
                          {position.market_question}
                        </td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            position.side === 'YES' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {position.side}
                          </span>
                        </td>
                        <td className="text-right">
                          <span className={`text-xs px-2 py-0.5 rounded ${outcomeColors[position.outcome]}`}>
                            {position.outcome}
                          </span>
                        </td>
                        <td className={`text-right font-mono text-sm ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {position.outcome === 'PENDING' ? '-' : formatPnL(pnl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Trade History (full row) */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">
          Trade History ({data.stats.trade_count})
        </h3>

        {data.trades.length === 0 ? (
          <p className="text-[var(--text-muted)] text-center py-8">
            No trades yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Side</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Week</th>
                </tr>
              </thead>
              <tbody>
                {data.trades.slice(0, 20).map((trade) => (
                  <tr
                    key={trade.id}
                    onClick={() => trade.decision_id && (window.location.href = `/decisions/${trade.decision_id}`)}
                    className={trade.decision_id ? 'cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors' : ''}
                    title={trade.decision_id ? 'Click to view decision rationale' : undefined}
                  >
                    <td className="text-sm">{formatDate(trade.timestamp)}</td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        trade.trade_type === 'BUY' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {trade.trade_type}
                      </span>
                    </td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        trade.side === 'YES' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="text-right font-mono">{formatCurrency(trade.total_amount)}</td>
                    <td className="text-right text-[var(--text-muted)]">{trade.decision_week}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Detail Modal */}
      {selectedDecision && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDecision(null)}
        >
          <div
            className="bg-[var(--bg-secondary)] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-[var(--border-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border-primary)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`badge ${
                    selectedDecision.action === 'BET' ? 'badge-active' :
                    selectedDecision.action === 'SELL' ? 'badge-pending' : ''
                  }`}>
                    {selectedDecision.action}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    Week {selectedDecision.decision_week}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDecision(null)}
                  className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-2">
                {formatDate(selectedDecision.decision_timestamp)}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <h4 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Reasoning
              </h4>
              {selectedDecision.reasoning ? (
                <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {selectedDecision.reasoning}
                </p>
              ) : (
                <p className="text-[var(--text-muted)] italic">No reasoning provided</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
              <button
                onClick={() => setSelectedDecision(null)}
                className="w-full py-2 px-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
