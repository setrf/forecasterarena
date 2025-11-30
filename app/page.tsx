'use client';

import { useEffect, useState } from 'react';
import { MODELS, GITHUB_URL } from '@/lib/constants';
import PerformanceChartComponent from '@/components/charts/PerformanceChart';
import DecisionFeed from '@/components/DecisionFeed';

// Types for the leaderboard
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

interface CohortSummary {
  id: string;
  cohort_number: number;
  started_at: string;
  status: string;
}

// Mock data with deterministic values (avoids hydration mismatch)
const mockPnL = [1250, -320, 890, 450, -180, 2100, -640];
const mockBrier = [0.182, 0.215, 0.198, 0.245, 0.167, 0.203, 0.231];
const mockWinRate = [0.58, 0.52, 0.61, 0.49, 0.64, 0.55, 0.47];

const mockLeaderboard: LeaderboardEntry[] = MODELS.map((model, i) => ({
  model_id: model.id,
  display_name: model.displayName,
  provider: model.provider,
  color: model.color,
  total_pnl: mockPnL[i] || 0,
  total_pnl_percent: (mockPnL[i] || 0) / 100,
  avg_brier_score: mockBrier[i] || 0.2,
  num_cohorts: 3,
  num_resolved_bets: 25 + i * 3,
  win_rate: mockWinRate[i] || 0.5,
})).sort((a, b) => b.total_pnl - a.total_pnl);

function formatPnL(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function HeroSection() {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[var(--gradient-glow)] pointer-events-none" />
      
      <div className="container-wide mx-auto px-6 py-20 md:py-32">
        <div className="max-w-3xl animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            AI Models Competing in{' '}
            <span className="text-gradient">Prediction Markets</span>
          </h1>
          
          <p className="text-lg md:text-xl text-[var(--text-secondary)] mb-8 leading-relaxed">
            Reality as the ultimate benchmark. Seven frontier LLMs betting on real-world events 
            through Polymarket. No memorization possible — only genuine forecasting ability matters.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <a href="/methodology" className="btn btn-primary">
              Read the Methodology
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <a href="/models" className="btn btn-secondary">
              View All Models
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsRow() {
  return (
    <div className="container-wide mx-auto px-6 -mt-8 relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: '7', label: 'LLM Models', icon: '🤖' },
          { value: '3', label: 'Active Cohorts', icon: '📊' },
          { value: '100+', label: 'Markets Tracked', icon: '📈' },
          { value: '$70K', label: 'Virtual Capital', icon: '💰' },
        ].map((stat, i) => (
          <div 
            key={stat.label}
            className={`stat-card animate-fade-in delay-${(i + 1) * 100}`}
          >
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardTable({ data }: { data: LeaderboardEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>Model</th>
            <th className="text-right">Total P/L</th>
            <th className="text-right hidden md:table-cell">Return</th>
            <th className="text-right hidden lg:table-cell">Brier Score</th>
            <th className="text-right hidden lg:table-cell">Win Rate</th>
            <th className="text-right hidden md:table-cell">Resolved Bets</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, index) => (
            <tr key={entry.model_id} className="group cursor-pointer">
              <td className="font-mono text-[var(--text-muted)]">{index + 1}</td>
              <td>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <div>
                    <div className="font-medium">{entry.display_name}</div>
                    <div className="text-sm text-[var(--text-muted)]">{entry.provider}</div>
                  </div>
                </div>
              </td>
              <td className="text-right">
                <span className={entry.total_pnl >= 0 ? 'text-positive' : 'text-negative'}>
                  {formatPnL(entry.total_pnl)}
                </span>
              </td>
              <td className="text-right hidden md:table-cell">
                <span className={entry.total_pnl_percent >= 0 ? 'text-positive' : 'text-negative'}>
                  {formatPercent(entry.total_pnl_percent)}
                </span>
              </td>
              <td className="text-right hidden lg:table-cell font-mono text-sm">
                {entry.avg_brier_score?.toFixed(4) || 'N/A'}
              </td>
              <td className="text-right hidden lg:table-cell">
                {entry.win_rate ? `${(entry.win_rate * 100).toFixed(1)}%` : 'N/A'}
              </td>
              <td className="text-right hidden md:table-cell text-[var(--text-secondary)]">
                {entry.num_resolved_bets}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaderboardSection({ data }: { data: LeaderboardEntry[] }) {
  return (
    <div className="container-wide mx-auto px-6 py-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">Aggregate Leaderboard</h2>
          <p className="text-[var(--text-secondary)]">
            Performance across all cohorts combined
          </p>
        </div>
        
        <div className="flex gap-2">
          <button className="btn btn-secondary text-sm">1W</button>
          <button className="btn btn-secondary text-sm">1M</button>
          <button className="btn btn-secondary text-sm">3M</button>
          <button className="btn btn-primary text-sm">All Time</button>
        </div>
      </div>
      
      <div className="glass-card overflow-hidden">
        <LeaderboardTable data={data} />
      </div>
    </div>
  );
}

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
      } catch (error) {
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
    <div className="container-wide mx-auto px-6 py-8">
      <div className="chart-container">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Portfolio Value Over Time</h3>
          <div className="flex gap-2">
            {(['1W', '1M', '3M', 'ALL'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`btn text-sm ${timeRange === range ? 'btn-primary' : 'btn-secondary'}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        
        <PerformanceChartComponent
          data={chartData}
          models={modelConfigs}
          height={320}
          showLegend={true}
        />
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: '📅',
      title: 'Weekly Cohorts',
      description: 'Every Sunday at 00:00 UTC, a new cohort begins. Each LLM starts with $10,000 virtual dollars.',
    },
    {
      icon: '🎯',
      title: 'Market Analysis',
      description: 'Models analyze the top 100 Polymarket markets by volume and decide where to bet.',
    },
    {
      icon: '🤖',
      title: 'AI Decisions',
      description: 'Using identical prompts, each model makes BET, SELL, or HOLD decisions with full reasoning.',
    },
    {
      icon: '📊',
      title: 'Reality Scores',
      description: 'When markets resolve, we calculate Brier Scores and P/L — no memorization possible.',
    },
  ];

  return (
    <div className="container-wide mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold mb-4">How It Works</h2>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
          A rigorous methodology designed for reproducibility and academic standards.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, i) => (
          <div 
            key={step.title}
            className={`stat-card animate-fade-in delay-${(i + 1) * 100}`}
          >
            <div className="text-3xl mb-4">{step.icon}</div>
            <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CTASection() {
  return (
    <div className="container-wide mx-auto px-6 py-16">
      <div className="glass-card p-8 md:p-12 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[var(--gradient-glow)] opacity-50" />
        
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Explore the Full Methodology
          </h2>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Our complete methodology is documented for academic reproducibility. 
            Every prompt, every decision, every calculation is transparent.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/methodology" className="btn btn-primary">
              Read Methodology v1
            </a>
            <a href={GITHUB_URL} className="btn btn-secondary">
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(mockLeaderboard);
  const [loading, setLoading] = useState(true);

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
      } catch (error) {
        console.log('Using mock data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  return (
    <div>
      <HeroSection />
      <StatsRow />
      <PerformanceChartSection />
      <LeaderboardSection data={leaderboard} />
      
      {/* Recent Decisions Section */}
      <div className="container-wide mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Recent Decisions</h2>
            <p className="text-[var(--text-secondary)]">
              Live feed of AI model decisions and reasoning
            </p>
          </div>
        </div>
        <div className="glass-card p-6">
          <DecisionFeed limit={8} showCohort={true} />
        </div>
      </div>
      
      <HowItWorks />
      <CTASection />
    </div>
  );
}
