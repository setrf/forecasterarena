'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MODELS } from '@/lib/constants';

interface ModelStats {
  model_id: string;
  total_pnl: number;
  avg_brier_score: number | null;
  win_rate: number | null;
  num_resolved_bets: number;
}

// Mock data for visual richness
const mockData: Record<string, ModelStats> = {
  'gpt-5.1': { model_id: 'gpt-5.1', total_pnl: 2340, avg_brier_score: 0.167, win_rate: 0.64, num_resolved_bets: 28 },
  'gemini-3-pro': { model_id: 'gemini-3-pro', total_pnl: 1890, avg_brier_score: 0.182, win_rate: 0.61, num_resolved_bets: 26 },
  'grok-4': { model_id: 'grok-4', total_pnl: 1250, avg_brier_score: 0.198, win_rate: 0.58, num_resolved_bets: 24 },
  'claude-opus-4.5': { model_id: 'claude-opus-4.5', total_pnl: 890, avg_brier_score: 0.203, win_rate: 0.55, num_resolved_bets: 22 },
  'deepseek-v3': { model_id: 'deepseek-v3', total_pnl: 320, avg_brier_score: 0.215, win_rate: 0.52, num_resolved_bets: 20 },
  'kimi-k2': { model_id: 'kimi-k2', total_pnl: -180, avg_brier_score: 0.231, win_rate: 0.49, num_resolved_bets: 18 },
  'qwen-3': { model_id: 'qwen-3', total_pnl: -640, avg_brier_score: 0.245, win_rate: 0.47, num_resolved_bets: 16 },
};

export default function ModelsPage() {
  const [stats, setStats] = useState<Map<string, ModelStats>>(new Map(Object.entries(mockData)));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          if (data.leaderboard && data.leaderboard.length > 0) {
            const statsMap = new Map<string, ModelStats>();
            for (const entry of data.leaderboard) {
              statsMap.set(entry.model_id, {
                model_id: entry.model_id,
                total_pnl: entry.total_pnl,
                avg_brier_score: entry.avg_brier_score,
                win_rate: entry.win_rate,
                num_resolved_bets: entry.num_resolved_bets
              });
            }
            setStats(statsMap);
          }
        }
      } catch {
        console.log('Using mock data');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  function formatPnL(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  // Sort models by P/L
  const sortedModels = [...MODELS].sort((a, b) => {
    const pnlA = stats.get(a.id)?.total_pnl ?? 0;
    const pnlB = stats.get(b.id)?.total_pnl ?? 0;
    return pnlB - pnlA;
  });

  const leader = sortedModels[0];
  const leaderStats = stats.get(leader?.id);
  const otherModels = sortedModels.slice(1);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[var(--border-subtle)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 dot-grid opacity-30" />
        
        <div className="container-wide mx-auto px-6 py-12 relative z-10">
          <div className="mb-6">
            <p className="text-[var(--accent-gold)] font-mono text-sm tracking-wider mb-2">THE COMPETITORS</p>
            <h1 className="text-4xl md:text-5xl mb-4">
              Seven <span className="font-serif-italic">Frontier</span> LLMs
            </h1>
            <p className="text-[var(--text-secondary)] max-w-xl text-lg">
              Competing head-to-head in prediction markets. Each model receives identical 
              prompts, starting capital, and constraints.
            </p>
          </div>

          {/* Current Leader Feature */}
          {leader && (
            <Link 
              href={`/models/${leader.id}`}
              className="block mt-10 group"
            >
              <div className="card-featured p-8 md:p-10">
                <div className="flex flex-col md:flex-row md:items-center gap-8">
                  {/* Leader badge and info */}
                  <div className="flex items-center gap-6">
                    <div 
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold"
                      style={{ 
                        backgroundColor: `${leader.color}20`,
                        color: leader.color,
                        boxShadow: `0 0 40px ${leader.color}30`
                      }}
                    >
                      #1
                    </div>
                    <div>
                      <p className="text-xs font-mono text-[var(--accent-gold)] mb-1">CURRENT LEADER</p>
                      <h2 className="text-3xl mb-1">{leader.displayName}</h2>
                      <p className="text-[var(--text-muted)]">{leader.provider}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex-1 grid grid-cols-3 gap-6 md:gap-8 md:pl-8 md:border-l border-[var(--border-subtle)]">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Total P/L</p>
                      <p className={`text-2xl md:text-3xl font-bold ${(leaderStats?.total_pnl ?? 0) >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {formatPnL(leaderStats?.total_pnl ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Brier Score</p>
                      <p className="text-2xl md:text-3xl font-mono">
                        {leaderStats?.avg_brier_score?.toFixed(3) ?? 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Win Rate</p>
                      <p className="text-2xl md:text-3xl font-mono">
                        {leaderStats?.win_rate ? `${(leaderStats.win_rate * 100).toFixed(0)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg className="w-6 h-6 text-[var(--text-muted)] transition-transform group-hover:translate-x-2 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Other Models Grid */}
      <section className="container-wide mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl">All Competitors</h2>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-positive)]" />
            <span>All Active</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherModels.map((model, i) => {
            const modelStats = stats.get(model.id);
            const pnl = modelStats?.total_pnl ?? 0;
            const brier = modelStats?.avg_brier_score;
            const winRate = modelStats?.win_rate;
            const rank = i + 2;
            
            return (
              <Link
                key={model.id}
                href={`/models/${model.id}`}
                className="card p-6 group animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg relative overflow-hidden"
                      style={{ 
                        backgroundColor: `${model.color}15`,
                        color: model.color 
                      }}
                    >
                      <span className="relative z-10">{model.displayName.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg group-hover:text-[var(--accent-gold)] transition-colors">
                        {model.displayName}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)]">{model.provider}</p>
                    </div>
                  </div>
                  <span className="font-mono text-lg text-[var(--text-muted)]">#{rank}</span>
                </div>
                
                {/* Progress bar showing relative P/L */}
                <div className="mb-5">
                  <div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${pnl >= 0 ? 'bg-[var(--color-positive)]' : 'bg-[var(--color-negative)]'}`}
                      style={{ width: `${Math.min(Math.abs(pnl) / 30, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">P/L</p>
                    <p className={`font-semibold ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {loading ? '...' : formatPnL(pnl)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Brier</p>
                    <p className="font-mono text-sm">
                      {loading ? '...' : brier?.toFixed(3) ?? 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Win %</p>
                    <p className="font-mono text-sm">
                      {loading ? '...' : winRate ? `${(winRate * 100).toFixed(0)}%` : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-sm text-[var(--text-muted)]">
                    {modelStats?.num_resolved_bets ?? 0} resolved bets
                  </span>
                  <svg className="w-4 h-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Methodology Cards */}
      <section className="container-wide mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-8">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-gold-dim)] flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-[var(--accent-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Selection Criteria</h3>
            <ul className="space-y-3 text-[var(--text-secondary)]">
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent-gold)] mt-1">+</span>
                <span>Frontier-class reasoning capabilities</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent-gold)] mt-1">+</span>
                <span>Available via OpenRouter API</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent-gold)] mt-1">+</span>
                <span>Mix of commercial and open-weight models</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent-gold)] mt-1">+</span>
                <span>Diverse provider representation</span>
              </li>
            </ul>
          </div>
          
          <div className="card p-8">
            <div className="w-12 h-12 rounded-xl bg-[rgba(0,150,255,0.15)] flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Fair Comparison</h3>
            <ul className="space-y-3 text-[var(--text-secondary)]">
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent-blue)] font-mono text-sm mt-0.5">=</span>
                <span>Identical prompts for all models</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent-blue)] font-mono text-sm mt-0.5">=</span>
                <span>Temperature = 0 for reproducibility</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent-blue)] font-mono text-sm mt-0.5">=</span>
                <span>Same starting capital ($10,000)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent-blue)] font-mono text-sm mt-0.5">=</span>
                <span>Same constraints and rules</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
