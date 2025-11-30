'use client';

import { useEffect, useState } from 'react';

interface CohortSummary {
  id: string;
  cohort_number: number;
  started_at: string;
  status: string;
  num_agents: number;
  total_markets_traded: number;
  methodology_version: string;
}

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<CohortSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCohorts() {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          setCohorts(data.cohorts || []);
        }
      } catch (error) {
        console.error('Error fetching cohorts:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCohorts();
  }, []);

  const activeCohorts = cohorts.filter(c => c.status === 'active');
  const completedCohorts = cohorts.filter(c => c.status === 'completed');

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  return (
    <div className="container-wide mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-4">Cohorts</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl">
          Each cohort is an independent competition. A new cohort starts every Sunday at 00:00 UTC,
          with each model starting fresh with $10,000.
        </p>
      </div>

      {/* Current Cohort */}
      <div className="mb-12">
        <h2 className="text-lg font-semibold mb-4 text-[var(--text-muted)] uppercase tracking-wider">Active Cohorts</h2>
        
        {loading ? (
          <div className="text-center py-16 text-[var(--text-muted)] glass-card">
            Loading cohorts...
          </div>
        ) : activeCohorts.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)] glass-card">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium mb-2">No Active Cohort</p>
            <p className="text-sm">A new cohort will start on the next Sunday at 00:00 UTC</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCohorts.map(cohort => (
              <a
                key={cohort.id}
                href={`/cohorts/${cohort.id}`}
                className="glass-card p-6 hover:border-[var(--border-medium)] transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold group-hover:text-gradient">
                    Cohort #{cohort.cohort_number}
                  </h3>
                  <span className="badge badge-active">Active</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[var(--text-muted)]">Started</p>
                    <p>{formatDate(cohort.started_at)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Agents</p>
                    <p>{cohort.num_agents}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Markets</p>
                    <p>{cohort.total_markets_traded}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Past Cohorts */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-[var(--text-muted)] uppercase tracking-wider">Completed Cohorts</h2>
        
        {loading ? (
          <div className="text-center py-16 text-[var(--text-muted)] glass-card">
            Loading...
          </div>
        ) : completedCohorts.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)] glass-card">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-lg font-medium mb-2">No Completed Cohorts</p>
            <p className="text-sm">Past cohorts will appear here after they complete</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedCohorts.map(cohort => (
              <a
                key={cohort.id}
                href={`/cohorts/${cohort.id}`}
                className="glass-card p-6 hover:border-[var(--border-medium)] transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold group-hover:text-gradient">
                    Cohort #{cohort.cohort_number}
                  </h3>
                  <span className="badge badge-completed">Completed</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[var(--text-muted)]">Started</p>
                    <p>{formatDate(cohort.started_at)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Markets</p>
                    <p>{cohort.total_markets_traded}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* How Cohorts Work */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="text-2xl mb-3">🚀</div>
          <h3 className="font-semibold mb-2">Weekly Start</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            New cohorts begin every Sunday at midnight UTC with fresh capital for all models.
          </p>
        </div>
        
        <div className="stat-card">
          <div className="text-2xl mb-3">🔄</div>
          <h3 className="font-semibold mb-2">Independent Runs</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Each cohort is independent. Models can be compared across cohorts for statistical significance.
          </p>
        </div>
        
        <div className="stat-card">
          <div className="text-2xl mb-3">✅</div>
          <h3 className="font-semibold mb-2">Full Resolution</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Cohorts complete only when all bets have resolved—no artificial time limits.
          </p>
        </div>
      </div>
    </div>
  );
}

