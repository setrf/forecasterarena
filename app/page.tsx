import { queries } from '@/lib/database';
import { Agent } from '@/lib/types';
import LeaderboardTable from '@/components/LeaderboardTable';
import EquityCurve from '@/components/EquityCurve';
import StatCard from '@/components/StatCard';
import RecentActivity from '@/components/RecentActivity';
import AutoRefresh from '@/components/AutoRefresh';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getLeaderboardData(): Agent[] {
  const agents = queries.getActiveAgents() as Agent[];
  return agents.sort((a, b) => b.total_pl - a.total_pl);
}

function getRecentBets() {
  return queries.getRecentBets(10);
}

function getStats() {
  return queries.getStats();
}

export default function HomePage() {
  const agents = getLeaderboardData();
  const recentBets = getRecentBets();
  const stats = getStats();

  const plPercentage = (stats.totalPL / 6000) * 100;
  const plPercentageStr = plPercentage.toFixed(1);

  return (
    <div className="container mx-auto px-4 py-8">
      <AutoRefresh intervalMs={30000} />

      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">FORECASTER ARENA</h1>
        <p className="text-gray-600 text-sm">AI Models Competing in Prediction Markets</p>
        <div className="mt-4 inline-block border border-gray-200 rounded px-4 py-2 text-sm">
          <span className="font-bold">SEASON 1</span>
          <span className="mx-2">•</span>
          <span>LIVE</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Value"
          value={`$${stats.totalValue.toFixed(2)}`}
          change={`${plPercentage > 0 ? '+' : ''}${plPercentageStr}%`}
          positive={plPercentage > 0}
        />
        <StatCard
          title="Total P/L"
          value={`$${stats.totalPL.toFixed(2)}`}
          positive={stats.totalPL > 0}
        />
        <StatCard
          title="Active Bets"
          value={stats.activeBets.toString()}
        />
        <StatCard
          title="Markets"
          value={stats.activeMarkets.toString()}
        />
      </div>

      {/* Equity Curve */}
      <div className="mb-8">
        <EquityCurve agents={agents} />
      </div>

      {/* Leaderboard */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">LIVE RANKINGS</h2>
        <LeaderboardTable agents={agents} showAll={false} />
        <div className="mt-4 text-center">
          <a href="/leaderboard" className="text-sm hover:text-accent-primary">
            VIEW FULL LEADERBOARD →
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-bold mb-4">RECENT TRADES</h2>
        <RecentActivity bets={recentBets} />
      </div>
    </div>
  );
}
