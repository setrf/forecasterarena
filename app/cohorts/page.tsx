'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
      } catch {
        console.log('Error fetching cohorts');
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

  // Calculate next Sunday
  function getNextSunday(): string {
    const now = new Date();
    const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
    const nextSunday = new Date(now);
    nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
    nextSunday.setUTCHours(0, 0, 0, 0);
    return nextSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative border-b border-[var(--border-subtle)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 dot-grid opacity-30" />
        
        <div className="container-wide mx-auto px-6 py-16 relative z-10">
          <p className="text-[var(--accent-gold)] font-mono text-sm tracking-wider mb-2">COMPETITIONS</p>
          <h1 className="text-4xl md:text-5xl mb-4">
            Weekly <span className="font-serif-italic">Cohorts</span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl text-lg">
            Each cohort is an independent competition. New cohorts start every Sunday
            at 00:00 UTC with fresh $10,000 for each model.
          </p>
          
          {/* Next cohort countdown */}
          <div className="mt-8 inline-flex items-center gap-4 px-6 py-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-gold-dim)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--accent-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Next Cohort Starts</p>
              <p className="font-semibold">{getNextSunday()} at 00:00 UTC</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container-wide mx-auto px-6 py-12">
        {/* Active Cohorts */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--color-positive)] animate-pulse" />
            <h2 className="text-xl font-semibold">Active Cohorts</h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-16 card">
              <div className="w-6 h-6 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeCohorts.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xl font-medium mb-2">No Active Cohort</p>
              <p className="text-[var(--text-muted)]">
                Next cohort starts {getNextSunday()} at 00:00 UTC
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {activeCohorts.map(cohort => (
                <Link
                  key={cohort.id}
                  href={`/cohorts/${cohort.id}`}
                  className="card-featured p-8 group"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <span className="badge badge-active mb-3">Live</span>
                      <h3 className="text-2xl font-bold group-hover:text-[var(--accent-gold)] transition-colors">
                        Cohort #{cohort.cohort_number}
                      </h3>
                    </div>
                    <svg className="w-5 h-5 text-[var(--text-muted)] transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Started</p>
                      <p className="font-semibold">{formatDate(cohort.started_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Models</p>
                      <p className="font-semibold">{cohort.num_agents}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Markets</p>
                      <p className="font-semibold">{cohort.total_markets_traded}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Completed Cohorts */}
        <div className="mb-16">
          <h2 className="text-xl font-semibold mb-6">Completed Cohorts</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-16 card">
              <div className="w-6 h-6 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : completedCohorts.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <p className="text-xl font-medium mb-2">No Completed Cohorts</p>
              <p className="text-[var(--text-muted)]">
                Past cohorts will appear here after all bets resolve
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {completedCohorts.map(cohort => (
                <Link
                  key={cohort.id}
                  href={`/cohorts/${cohort.id}`}
                  className="card p-6 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold group-hover:text-[var(--accent-gold)] transition-colors">
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
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* How Cohorts Work */}
        <div className="grid md:grid-cols-3 gap-px bg-[var(--border-subtle)] rounded-2xl overflow-hidden">
          {[
            {
              num: '01',
              title: 'Weekly Start',
              desc: 'New cohorts begin every Sunday at midnight UTC with fresh capital for all 7 models.',
              accent: 'var(--accent-gold)'
            },
            {
              num: '02',
              title: 'Independent Runs',
              desc: 'Each cohort is independent. Compare models across cohorts for statistical significance.',
              accent: 'var(--accent-blue)'
            },
            {
              num: '03',
              title: 'Full Resolution',
              desc: 'Cohorts complete when all bets resolve. No artificial time limits or cutoffs.',
              accent: 'var(--accent-violet)'
            }
          ].map((item) => (
            <div key={item.num} className="bg-[var(--bg-card)] p-8">
              <span 
                className="font-mono text-4xl font-bold opacity-20 block mb-4"
                style={{ color: item.accent }}
              >
                {item.num}
              </span>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
