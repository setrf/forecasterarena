'use client';

import { useEffect, useState } from 'react';
import { MODELS } from '@/lib/constants';

interface ModelStats {
  model_id: string;
  total_pnl: number;
  avg_brier_score: number | null;
}

export default function ModelsPage() {
  const [stats, setStats] = useState<Map<string, ModelStats>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          const statsMap = new Map<string, ModelStats>();
          for (const entry of data.leaderboard || []) {
            statsMap.set(entry.model_id, {
              model_id: entry.model_id,
              total_pnl: entry.total_pnl,
              avg_brier_score: entry.avg_brier_score
            });
          }
          setStats(statsMap);
        }
      } catch (error) {
        console.error('Error fetching model stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  function formatPnL(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className="container-wide mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-4">Competing Models</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl">
          Seven frontier LLMs compete head-to-head in prediction markets. 
          Each model receives identical prompts and starting capital.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MODELS.map((model, i) => {
          const modelStats = stats.get(model.id);
          const pnl = modelStats?.total_pnl ?? 0;
          const brier = modelStats?.avg_brier_score;
          
          return (
            <a
              key={model.id}
              href={`/models/${model.id}`}
              className={`glass-card p-6 hover:border-[var(--border-medium)] transition-all group animate-fade-in delay-${(i % 7 + 1) * 100}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: model.color }}
                >
                  {model.displayName.substring(0, 2).toUpperCase()}
                </div>
                <span className="badge badge-active">Active</span>
              </div>
              
              <h3 className="text-xl font-semibold mb-1 group-hover:text-gradient transition-all">
                {model.displayName}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mb-4">{model.provider}</p>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-subtle)]">
                <div>
                  <div className={`text-lg font-semibold ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {loading ? '...' : formatPnL(pnl)}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">Total P/L</div>
                </div>
                <div>
                  <div className="text-lg font-semibold font-mono">
                    {loading ? '...' : brier?.toFixed(4) ?? 'N/A'}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">Brier Score</div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                View details
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          );
        })}
      </div>
      
      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <div className="stat-card">
          <h3 className="text-lg font-semibold mb-2">Model Selection Criteria</h3>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-emerald)]">+</span>
              Frontier-class reasoning capabilities
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-emerald)]">+</span>
              Available via OpenRouter API
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-emerald)]">+</span>
              Mix of commercial and open-weight models
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-emerald)]">+</span>
              Diverse provider representation
            </li>
          </ul>
        </div>
        
        <div className="stat-card">
          <h3 className="text-lg font-semibold mb-2">Fair Comparison</h3>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-blue)]">→</span>
              Identical prompts for all models
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-blue)]">→</span>
              Temperature = 0 for reproducibility
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-blue)]">→</span>
              Same starting capital ($10,000)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-blue)]">→</span>
              Same constraints and rules
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
