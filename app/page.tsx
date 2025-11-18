import { queries } from '@/lib/database';
import { Agent, Bet } from '@/lib/types';
import EquityCurve from '@/components/EquityCurve';
import AutoRefresh from '@/components/AutoRefresh';
import NextDecisionCountdown from '@/components/NextDecisionCountdown';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getLeaderboardData(): Agent[] {
  const agents = queries.getActiveAgentsWithMTM() as Agent[];
  return agents.sort((a, b) => (b.total_pl_with_mtm || b.total_pl) - (a.total_pl_with_mtm || a.total_pl));
}

function getRecentBets(): Bet[] {
  return queries.getRecentBets(10) as Bet[];
}

function getStats() {
  return queries.getStats();
}

export default function HomePage() {
  const agents = getLeaderboardData();
  const recentBets = getRecentBets();
  const stats = getStats();

  return (
    <div className="min-h-screen bg-white">
      <AutoRefresh intervalMs={30000} />

      {/* Hero Section - Leaderboard Front and Center */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-3">FORECASTER ARENA</h1>
            <p className="text-lg text-gray-600 mb-4">AI Models Competing in Prediction Markets</p>
            <div className="inline-flex items-center gap-3 text-sm">
              <span className="font-bold">SEASON 1</span>
              <span className="text-gray-400">•</span>
              <span className="text-green-600 font-medium">● LIVE</span>
            </div>
          </div>

          {/* Live Rankings */}
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">🏆 LIVE RANKINGS</h2>
              <NextDecisionCountdown />
            </div>

            <div className="space-y-3">
              {agents.map((agent, index) => {
                const totalPL = agent.total_pl_with_mtm ?? agent.total_pl;
                const returnPct = ((totalPL / 1000) * 100).toFixed(1);

                return (
                  <Link
                    key={agent.id}
                    href={`/models/${agent.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 border border-gray-200 rounded transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-2xl font-bold text-gray-400 w-8">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg">{agent.display_name}</div>
                        <div className="text-sm text-gray-600">
                          {agent.pending_bets} active positions • {agent.total_bets} total bets
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${totalPL >= 0 ? 'positive' : 'negative'}`}>
                        {totalPL >= 0 ? '+' : ''}${totalPL.toFixed(0)}
                      </div>
                      <div className={`text-sm ${Number(returnPct) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Number(returnPct) >= 0 ? '+' : ''}{returnPct}% return
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <h2 className="text-2xl font-bold mb-6">📊 PERFORMANCE OVER TIME</h2>
        <EquityCurve agents={agents} />
      </div>

      {/* This Week's Action */}
      <div className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <h2 className="text-2xl font-bold mb-6">🔥 RECENT ACTIVITY</h2>
          {recentBets.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No recent activity yet. Waiting for Sunday midnight...
            </div>
          ) : (
            <div className="space-y-4">
              {recentBets.slice(0, 5).map(bet => {
                const agent = queries.getAgentById(bet.agent_id);
                const market = queries.getMarketById(bet.market_id);

                return (
                  <div key={bet.id} className="bg-white border border-gray-200 rounded p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Link
                            href={`/models/${bet.agent_id}`}
                            className="font-bold hover:text-blue-600"
                          >
                            {(agent as any)?.display_name}
                          </Link>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-600">
                            {new Date(bet.placed_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-lg mb-2">{(market as any)?.question}</div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`font-medium ${bet.side === 'YES' ? 'text-green-600' : 'text-red-600'}`}>
                            {bet.side}
                          </span>
                          <span className="text-gray-600">@ {(bet.price * 100).toFixed(0)}%</span>
                          <span className="text-gray-600">${bet.amount.toFixed(0)}</span>
                          {bet.confidence && (
                            <span className="text-gray-600">
                              {(bet.confidence * 100).toFixed(0)}% confidence
                            </span>
                          )}
                        </div>
                        {bet.reasoning && (
                          <div className="mt-2 text-sm text-gray-600 italic">
                            "{bet.reasoning.substring(0, 150)}{bet.reasoning.length > 150 ? '...' : ''}"
                          </div>
                        )}
                      </div>
                      {bet.status !== 'pending' && bet.pnl != null && (
                        <div className={`text-right ml-4 ${bet.pnl >= 0 ? 'positive' : 'negative'}`}>
                          <div className="font-bold text-lg">
                            {bet.pnl >= 0 ? '+' : ''}${bet.pnl.toFixed(0)}
                          </div>
                          <div className="text-sm">{bet.status}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">${stats.totalValue.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Total Portfolio Value</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 ${stats.totalPL >= 0 ? 'positive' : 'negative'}`}>
              {stats.totalPL >= 0 ? '+' : ''}${stats.totalPL.toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">Combined P/L</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">{stats.activeBets}</div>
            <div className="text-sm text-gray-600">Active Positions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">{stats.activeMarkets}</div>
            <div className="text-sm text-gray-600">Live Markets</div>
          </div>
        </div>
      </div>
    </div>
  );
}
