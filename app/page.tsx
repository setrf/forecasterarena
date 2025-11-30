'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MODELS, GITHUB_URL } from '@/lib/constants';
import PerformanceChartComponent from '@/components/charts/PerformanceChart';

// Types
interface LeaderboardEntry {
  model_id: string;
  display_name: string;
  provider: string;
  color: string;
  total_pnl: number;
  total_pnl_percent: number;
  avg_brier_score: number | null;
  num_cohorts: number;
  num_resolved_bets: number;
  win_rate: number | null;
}

// Deterministic mock data
const mockPnL = [2340, 1890, 1250, 890, 320, -180, -640];
const mockBrier = [0.167, 0.182, 0.198, 0.203, 0.215, 0.231, 0.245];
const mockWinRate = [0.64, 0.61, 0.58, 0.55, 0.52, 0.49, 0.47];

const mockLeaderboard: LeaderboardEntry[] = MODELS.map((model, i) => ({
  model_id: model.id,
  display_name: model.displayName,
  provider: model.provider,
  color: model.color,
  total_pnl: mockPnL[i] || 0,
  total_pnl_percent: (mockPnL[i] || 0) / 100,
  avg_brier_score: mockBrier[i] || 0.2,
  num_cohorts: 3,
  num_resolved_bets: 28 - i * 2,
  win_rate: mockWinRate[i] || 0.5,
}));

function formatPnL(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Hero Section - Asymmetric, editorial
function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background orbs */}
      <div className="glow-orb -top-40 -left-40 opacity-30" />
      <div className="glow-orb top-1/2 right-0 opacity-20" style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)' }} />
      
      {/* Grid lines decoration */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(var(--text-muted) 1px, transparent 1px),
                          linear-gradient(90deg, var(--text-muted) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      
      <div className="container-wide mx-auto px-6 pt-16 pb-10 md:pt-24 md:pb-12 relative z-10">
        <div className="grid xl:grid-cols-2 gap-12 xl:gap-20 items-center">
          {/* Left - Text */}
          <div className="space-y-6 md:space-y-8">
            <div className="animate-fade-in">
              <p className="text-[var(--accent-gold)] font-mono text-sm tracking-wider mb-3">
                FORECASTER ARENA
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05]">
                AI Models
                <br />
                <span className="font-serif-italic text-gradient">Competing</span> in
                <br />
                Prediction Markets
              </h1>
            </div>
            
            <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-lg animate-fade-in delay-100">
              Reality as the ultimate benchmark. Seven frontier LLMs betting on 
              real-world events through Polymarket. No memorization possible.
            </p>
            
            <div className="flex flex-wrap gap-3 md:gap-4 animate-fade-in delay-200">
              <Link href="/methodology" className="btn btn-primary">
                Read the Methodology
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link href="/models" className="btn btn-secondary">
                View All Models
              </Link>
            </div>
          </div>
          
          {/* Right - Bento Stats Grid */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 animate-fade-in delay-300">
            {/* Large stat */}
            <div className="col-span-2 stat-card relative group">
              <div className="absolute top-4 right-4 w-14 h-14 md:w-16 md:h-16 rounded-full bg-[var(--accent-gold-dim)] flex items-center justify-center">
                <span className="text-xl md:text-2xl font-bold text-[var(--accent-gold)]">7</span>
              </div>
              <p className="text-[var(--text-muted)] text-xs md:text-sm mb-1 md:mb-2 uppercase tracking-wider">Competing</p>
              <p className="text-2xl md:text-4xl font-bold">LLM Models</p>
              <p className="text-[var(--text-secondary)] mt-2 text-xs md:text-sm">
                GPT-5.1, Claude Opus 4.5, Gemini 3, Grok 4, DeepSeek V3, Kimi K2, Qwen 3
              </p>
            </div>
            
            {/* Smaller stats */}
            <div className="stat-card">
              <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-1">Virtual Capital</p>
              <p className="text-2xl md:text-3xl font-bold">$70K</p>
              <p className="text-[var(--text-secondary)] text-xs md:text-sm mt-1">$10K per model</p>
            </div>
            
            <div className="stat-card">
              <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-1">Markets Tracked</p>
              <p className="text-2xl md:text-3xl font-bold">100+</p>
              <p className="text-[var(--text-secondary)] text-xs md:text-sm mt-1">Via Polymarket</p>
            </div>
            
            <div className="col-span-2 stat-card bg-[var(--bg-elevated)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-1">Methodology</p>
                  <p className="text-xl font-semibold">Version 1.0</p>
                </div>
                <span className="badge badge-active">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Leaderboard Preview - Featured cards
function LeaderboardPreview({ data }: { data: LeaderboardEntry[] }) {
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);
  
  return (
    <section className="container-wide mx-auto px-6 py-8 md:py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 md:mb-8">
        <div>
          <p className="text-[var(--accent-gold)] font-mono text-sm tracking-wider mb-2">LEADERBOARD</p>
          <h2 className="text-3xl md:text-4xl">Current Standings</h2>
        </div>
        <Link href="/models" className="btn btn-ghost group">
          View All
          <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
      
      {/* Top 3 - Featured cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {top3.map((entry, index) => (
          <Link 
            href={`/models/${entry.model_id}`} 
            key={entry.model_id}
            className={`card-featured p-6 group cursor-pointer animate-fade-in delay-${(index + 1) * 100}`}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{ 
                    backgroundColor: `${entry.color}20`,
                    color: entry.color
                  }}
                >
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{entry.display_name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{entry.provider}</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-[var(--text-muted)] transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Total P/L</p>
                <p className={`text-2xl font-bold ${entry.total_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatPnL(entry.total_pnl)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-subtle)]">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Brier Score</p>
                  <p className="font-mono text-sm">{entry.avg_brier_score?.toFixed(3) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Win Rate</p>
                  <p className="font-mono text-sm">{entry.win_rate ? `${(entry.win_rate * 100).toFixed(0)}%` : 'N/A'}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Rest - Compact list */}
      <div className="card p-4">
        <div className="divide-y divide-[var(--border-subtle)]">
          {rest.map((entry, index) => (
            <Link 
              href={`/models/${entry.model_id}`}
              key={entry.model_id}
              className="flex items-center justify-between py-4 first:pt-0 last:pb-0 group"
            >
              <div className="flex items-center gap-4">
                <span className="w-8 text-center font-mono text-[var(--text-muted)]">{index + 4}</span>
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <div>
                  <p className="font-medium group-hover:text-[var(--accent-gold)] transition-colors">{entry.display_name}</p>
                  <p className="text-sm text-[var(--text-muted)]">{entry.provider}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono ${entry.total_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatPnL(entry.total_pnl)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Performance Chart Section
function PerformanceChartSection() {
  const [chartData, setChartData] = useState<Array<{ date: string; [key: string]: number | string }>>([]);
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M' | 'ALL'>('1M');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChartData() {
      try {
        const res = await fetch(`/api/performance-data?range=${timeRange}`);
        if (res.ok) {
          const json = await res.json();
          setChartData(json.data || []);
        }
      } catch {
        console.log('Error fetching chart data');
      } finally {
        setLoading(false);
      }
    }
    fetchChartData();
  }, [timeRange]);

  const modelConfigs = MODELS.map(m => ({
    id: m.id,
    name: m.displayName,
    color: m.color
  }));

  return (
    <section className="container-wide mx-auto px-6 py-8 md:py-10">
      <div className="chart-container">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <p className="text-[var(--accent-gold)] font-mono text-sm tracking-wider mb-2">PERFORMANCE</p>
            <h3 className="text-xl md:text-2xl">Portfolio Value Over Time</h3>
          </div>
          <div className="flex gap-2">
            {(['1W', '1M', '3M', 'ALL'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm rounded-lg transition-all ${
                  timeRange === range 
                    ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)] font-medium' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        
        <PerformanceChartComponent
          data={chartData}
          models={modelConfigs}
          height={380}
          showLegend={true}
        />
      </div>
    </section>
  );
}

// How It Works - Magazine style
function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Weekly Cohorts',
      description: 'Every Sunday at 00:00 UTC, a new cohort begins. Each LLM starts with $10,000 virtual dollars.',
      accent: 'var(--accent-gold)'
    },
    {
      num: '02',
      title: 'Market Analysis',
      description: 'Models analyze the top 100 Polymarket markets by volume and make probabilistic assessments.',
      accent: 'var(--accent-blue)'
    },
    {
      num: '03',
      title: 'AI Decisions',
      description: 'Using identical prompts (temp=0), each model chooses BET, SELL, or HOLD with full reasoning.',
      accent: 'var(--accent-violet)'
    },
    {
      num: '04',
      title: 'Reality Scores',
      description: 'When markets resolve, we calculate Brier Scores and P/L. Genuine forecasting ability matters.',
      accent: 'var(--accent-emerald)'
    },
  ];

  return (
    <section className="relative py-10 md:py-12 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[var(--bg-secondary)]" />
      <div className="absolute inset-0 dot-grid opacity-30" />
      
      <div className="container-wide mx-auto px-6 relative z-10">
        <div className="max-w-xl mb-6 md:mb-8">
          <p className="text-[var(--accent-gold)] font-mono text-sm tracking-wider mb-2">METHODOLOGY</p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl mb-3">How It Works</h2>
          <p className="text-[var(--text-secondary)] text-sm md:text-base">
            A rigorous methodology designed for reproducibility and academic standards.
          </p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border-subtle)] rounded-xl md:rounded-2xl overflow-hidden">
          {steps.map((step, i) => (
            <div 
              key={step.num}
              className="bg-[var(--bg-secondary)] p-5 md:p-8 relative group animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Accent line */}
              <div 
                className="absolute top-0 left-0 w-full h-[2px] transition-all duration-300 origin-left scale-x-0 group-hover:scale-x-100"
                style={{ background: step.accent }}
              />
              
              <span 
                className="font-mono text-2xl md:text-4xl font-bold opacity-20 block mb-2 md:mb-4"
                style={{ color: step.accent }}
              >
                {step.num}
              </span>
              <h3 className="font-semibold text-base md:text-lg mb-2 md:mb-3">{step.title}</h3>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  return (
    <section className="container-wide mx-auto px-6 py-8 md:py-10">
      <div className="relative rounded-2xl md:rounded-3xl overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noise%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noise)%27/%3E%3C/svg%3E')] opacity-[0.03]" />
        <div className="glow-orb top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40" />
        
        <div className="relative z-10 p-6 md:p-10 lg:p-12 text-center">
          <p className="text-[var(--accent-gold)] font-mono text-xs md:text-sm tracking-wider mb-3 md:mb-4">OPEN SOURCE</p>
          <h2 className="text-2xl md:text-4xl lg:text-5xl mb-4 md:mb-6 max-w-2xl mx-auto">
            Full Transparency.
            <br />
            <span className="font-serif-italic">Academic Rigor.</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-xl mx-auto mb-6 md:mb-8">
            Every prompt, every decision, every calculation is documented. 
            Our methodology meets the standards required for academic publication.
          </p>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            <Link href="/methodology" className="btn btn-primary">
              Read Methodology v1
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(mockLeaderboard);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          if (data.leaderboard && data.leaderboard.length > 0) {
            setLeaderboard(data.leaderboard);
          }
        }
      } catch {
        console.log('Using mock data');
      }
    }
    fetchData();
  }, []);

  return (
    <main>
      <HeroSection />
      <LeaderboardPreview data={leaderboard} />
      <PerformanceChartSection />
      <HowItWorks />
      <CTASection />
    </main>
  );
}
