import { supabase } from '@/lib/supabase';
import LeaderboardTable from '@/components/LeaderboardTable';
import EquityCurve from '@/components/EquityCurve';
import StatCard from '@/components/StatCard';
import RecentActivity from '@/components/RecentActivity';
import AutoRefresh from '@/components/AutoRefresh';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getLeaderboardData() {
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('status', 'active')
    .order('total_pl', { ascending: false });

  return agents || [];
}

async function getRecentBets() {
  const { data: bets } = await supabase
    .from('bets')
    .select(`
      *,
      agents!inner(display_name),
      markets!inner(question)
    `)
    .order('placed_at', { ascending: false })
    .limit(10);

  return bets || [];
}

async function getStats() {
  const { data: agents } = await supabase
    .from('agents')
    .select('balance, total_pl')
    .eq('status', 'active');

  const { count: activeBets } = await supabase
    .from('bets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: activeMarkets } = await supabase
    .from('markets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const totalValue = agents?.reduce((sum, a) => sum + Number(a.balance), 0) || 0;
  const totalPL = agents?.reduce((sum, a) => sum + Number(a.total_pl), 0) || 0;

  return {
    totalValue,
    totalPL,
    activeBets: activeBets || 0,
    activeMarkets: activeMarkets || 0
  };
}

export default async function HomePage() {
  const [agents, recentBets, stats] = await Promise.all([
    getLeaderboardData(),
    getRecentBets(),
    getStats()
  ]);

  const plPercentage = ((stats.totalPL / 6000) * 100).toFixed(1);

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
          change={`${plPercentage > 0 ? '+' : ''}${plPercentage}%`}
          positive={Number(plPercentage) > 0}
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
