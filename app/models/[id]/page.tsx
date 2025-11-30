'use client';

import { useEffect, useState, useMemo, use } from 'react';
import { useParams } from 'next/navigation';
import { MODELS } from '@/lib/constants';
import PerformanceChart from '@/components/charts/PerformanceChart';

interface CohortPerformance {
  cohort_number: number;
  cohort_status: string;
  agent_status: string;
  cash_balance: number;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  brier_score: number | null;
  num_resolved_bets: number;
}

interface Decision {
  id: string;
  cohort_number: number;
  decision_week: number;
  decision_timestamp: string;
  action: string;
  reasoning: string | null;
}

interface EquityPoint {
  snapshot_date: string;
  total_value: number;
  cohort_number: number;
}

interface ModelData {
  model: {
    id: string;
    display_name: string;
    provider: string;
    color: string;
  };
  num_cohorts: number;
  total_pnl: number;
  avg_pnl_percent: number;
  avg_brier_score: number | null;
  win_rate: number | null;
  cohort_performance: CohortPerformance[];
  recent_decisions: Decision[];
  equity_curve: EquityPoint[];
}

export default function ModelDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const model = MODELS.find(m => m.id === id);
  const [data, setData] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/models/${id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Error fetching model data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [id]);

  // Transform equity curve for chart
  const chartData = useMemo(() => {
    if (!data?.equity_curve?.length) return [];
    return data.equity_curve.map(point => ({
      date: point.snapshot_date,
      [id]: point.total_value
    }));
  }, [data, id]);

  const chartModels = model ? [{
    id: model.id,
    name: model.displayName,
    color: model.color
  }] : [];

  if (!model) {
    return (
      <div className="container-wide mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Model Not Found</h1>
        <p className="text-[var(--text-secondary)] mb-6">
          The model you&apos;re looking for doesn&apos;t exist.
        </p>
        <a href="/models" className="btn btn-primary">
          View All Models
        </a>
      </div>
    );
  }

  function formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatPnL(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${formatCurrency(value)}`;
  }

  function formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Calculate aggregate stats
  const totalPnl = data?.total_pnl || 0;
  const avgPnlPercent = data?.avg_pnl_percent || 0;
  const avgBrier = data?.avg_brier_score;
  const winRate = data?.win_rate;
  const numCohorts = data?.num_cohorts || 0;

  return (
    <div className="container-wide mx-auto px-6 py-12">
      {/* Back link at top */}
      <a href="/models" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all models
      </a>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start gap-6 mb-10">
        <div 
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
          style={{ backgroundColor: model.color }}
        >
          {model.displayName.substring(0, 2).toUpperCase()}
        </div>
        
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{model.displayName}</h1>
            <span className="badge badge-active">Active</span>
          </div>
          <p className="text-[var(--text-secondary)]">
            {model.provider} • OpenRouter ID: <code className="text-sm font-mono bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">{model.openrouterId}</code>
          </p>
        </div>
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <div className="stat-card">
          <div className={`stat-value ${totalPnl >= 0 ? 'text-positive' : 'text-negative'}`}>
            {loading ? '...' : formatPnL(totalPnl)}
          </div>
          <div className="stat-label">Total P/L</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${avgPnlPercent >= 0 ? 'text-positive' : 'text-negative'}`}>
            {loading ? '...' : formatPercent(avgPnlPercent)}
          </div>
          <div className="stat-label">Avg Return</div>
        </div>
        <div className="stat-card">
          <div className="stat-value font-mono">
            {loading ? '...' : avgBrier?.toFixed(4) || 'N/A'}
          </div>
          <div className="stat-label">Avg Brier Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {loading ? '...' : winRate ? `${(winRate * 100).toFixed(1)}%` : 'N/A'}
          </div>
          <div className="stat-label">Win Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{loading ? '...' : numCohorts}</div>
          <div className="stat-label">Cohorts</div>
        </div>
      </div>
      
      {/* Performance Chart */}
      <div className="chart-container mb-10">
        <h3 className="text-lg font-semibold mb-4">Portfolio Value Over Time</h3>
        <PerformanceChart
          data={chartData}
          models={chartModels}
          height={280}
          showLegend={false}
        />
      </div>
      
      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cohort Performance */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Cohort Performance</h3>
          
          {loading ? (
            <div className="text-center py-8 text-[var(--text-muted)]">Loading...</div>
          ) : !data?.cohort_performance?.length ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <p>No cohort data yet</p>
              <p className="text-sm mt-2">Check back after the first cohort starts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.cohort_performance.map((cohort) => (
                <div 
                  key={cohort.cohort_number}
                  className="p-4 bg-[var(--bg-tertiary)] rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Cohort #{cohort.cohort_number}</span>
                    <span className={`badge ${cohort.cohort_status === 'active' ? 'badge-active' : 'badge-completed'}`}>
                      {cohort.cohort_status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--text-muted)]">Value</p>
                      <p className="font-mono">{formatCurrency(cohort.total_value)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-muted)]">P/L</p>
                      <p className={`font-mono ${cohort.total_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {formatPnL(cohort.total_pnl)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--text-muted)]">Brier</p>
                      <p className="font-mono">{cohort.brier_score?.toFixed(4) || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Recent Decisions */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Decisions</h3>
          
          {loading ? (
            <div className="text-center py-8 text-[var(--text-muted)]">Loading...</div>
          ) : !data?.recent_decisions?.length ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <p>No decisions yet</p>
              <p className="text-sm mt-2">Decisions are made every Sunday at 00:00 UTC</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recent_decisions.slice(0, 5).map((decision) => (
                <div 
                  key={decision.id}
                  className="p-4 bg-[var(--bg-tertiary)] rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        decision.action === 'BET' ? 'badge-active' :
                        decision.action === 'SELL' ? 'badge-pending' : ''
                      }`}>
                        {decision.action}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">
                        Cohort #{decision.cohort_number}, Week {decision.decision_week}
                      </span>
                    </div>
                    <span className="text-sm text-[var(--text-muted)]">
                      {formatDate(decision.decision_timestamp)}
                    </span>
                  </div>
                  {decision.reasoning && (
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                      {decision.reasoning}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
