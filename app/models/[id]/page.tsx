import { queries, getAgentPendingBetsWithMTM } from '@/lib/database';
import { Agent, Bet } from '@/lib/types';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default function ModelPage({ params }: PageProps) {
  const agent = queries.getAgentWithMTM(params.id);

  if (!agent) {
    notFound();
  }

  const allAgents = queries.getActiveAgentsWithMTM() as Agent[];
  const sortedAgents = [...allAgents].sort((a, b) =>
    (b.total_pl_with_mtm || b.total_pl) - (a.total_pl_with_mtm || a.total_pl)
  );
  const rank = sortedAgents.findIndex(a => a.id === agent.id) + 1;

  const pendingBets = getAgentPendingBetsWithMTM(agent.id);

  // Get all bets for history
  const allBets = queries.getBetsByAgent(agent.id, 50) as Bet[];
  const resolvedBets = allBets.filter(b => b.status === 'won' || b.status === 'lost' || b.status === 'sold');

  // Category performance
  const categoryStats: Record<string, { pl: number; count: number }> = {};
  resolvedBets.forEach(bet => {
    const market = queries.getMarketById(bet.market_id) as any;
    if (market && market.category) {
      const cat = market.category;
      if (!categoryStats[cat]) categoryStats[cat] = { pl: 0, count: 0 };
      categoryStats[cat].pl += bet.pnl || 0;
      categoryStats[cat].count += 1;
    }
  });

  const totalPL = agent.total_pl_with_mtm ?? agent.total_pl;
  const unrealizedPL = agent.mtm_pl ?? 0;
  const returnPct = ((totalPL / 1000) * 100).toFixed(1);
  const winRate = agent.total_bets > 0
    ? ((agent.winning_bets / agent.total_bets) * 100).toFixed(1)
    : '0.0';

  // Calculate average confidence and hold time
  const betsWithConfidence = allBets.filter(b => b.confidence);
  const avgConfidence = betsWithConfidence.length > 0
    ? (betsWithConfidence.reduce((sum, b) => sum + (b.confidence || 0), 0) / betsWithConfidence.length * 100).toFixed(0)
    : 'N/A';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          <Link href="/" className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:underline transition-all duration-200 mb-4 inline-block focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 rounded">
            ← Back to Leaderboard
          </Link>

          <div className="flex flex-col md:flex-row items-start justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{agent.display_name}</h1>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm sm:text-base md:text-lg">
                <span className="text-gray-600">Rank: <span className="font-bold text-black">#{rank}</span></span>
                <span className={`font-bold ${totalPL >= 0 ? 'positive' : 'negative'}`}>
                  Total P/L: {totalPL >= 0 ? '+' : ''}${totalPL.toFixed(0)}
                </span>
              </div>
            </div>
            <div className="text-left md:text-right">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Return on Investment</div>
              <div className={`text-2xl sm:text-3xl font-bold ${Number(returnPct) >= 0 ? 'positive' : 'negative'}`}>
                {Number(returnPct) >= 0 ? '+' : ''}{returnPct}%
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="border border-gray-200 rounded p-3 sm:p-4 hover:border-accent-primary hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Cash Balance</div>
              <div className="text-xl sm:text-2xl font-bold">${agent.balance.toFixed(0)}</div>
            </div>
            <div className="border border-gray-200 rounded p-3 sm:p-4 hover:border-accent-primary hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">In Positions</div>
              <div className="text-xl sm:text-2xl font-bold">
                ${pendingBets.reduce((sum, b) => sum + b.bet_amount, 0).toFixed(0)}
              </div>
            </div>
            <div className="border border-accent-primary rounded p-3 sm:p-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Realized P/L</div>
              <div className={`text-xl sm:text-2xl font-bold ${agent.total_pl >= 0 ? 'positive' : 'negative'}`}>
                {agent.total_pl >= 0 ? '+' : ''}${agent.total_pl.toFixed(0)}
              </div>
            </div>
            <div className="border border-accent-primary rounded p-3 sm:p-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Unrealized P/L</div>
              <div className={`text-xl sm:text-2xl font-bold ${unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
                {unrealizedPL >= 0 ? '+' : ''}${unrealizedPL.toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {/* Current Positions */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">💼 CURRENT POSITIONS ({pendingBets.length})</h2>
          {pendingBets.length === 0 ? (
            <div className="border border-gray-200 rounded p-8 text-center text-gray-600">
              No active positions
            </div>
          ) : (
            <div className="space-y-4">
              {pendingBets.map(bet => {
                const priceChange = ((bet.current_price - bet.entry_price) * 100).toFixed(1);
                const isProfit = bet.mtm_pnl > 0;

                return (
                  <div key={bet.bet_id} className="border border-gray-200 rounded p-4 sm:p-6 hover:shadow-lg hover:border-accent-primary transition-all duration-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-base sm:text-lg mb-1">{bet.market_question}</h3>
                        <div className="text-xs sm:text-sm text-gray-600">
                          {bet.side} @ {(bet.entry_price * 100).toFixed(0)}%
                          → {(bet.current_price * 100).toFixed(0)}%
                          <span className={`ml-2 ${Number(priceChange) >= 0 ? 'positive' : 'negative'}`}>
                            ({Number(priceChange) >= 0 ? '+' : ''}{priceChange}%)
                          </span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-xs sm:text-sm text-gray-600">Unrealized P/L</div>
                        <div className={`text-lg sm:text-xl font-bold ${isProfit ? 'positive' : 'negative'}`}>
                          {isProfit ? '+' : ''}${bet.mtm_pnl.toFixed(0)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Position size: ${bet.bet_amount.toFixed(0)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Trade History */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">📜 TRADE HISTORY</h2>
          {resolvedBets.length === 0 ? (
            <div className="border border-gray-200 rounded p-8 text-center text-gray-600">
              No trades yet
            </div>
          ) : (
            <div className="border border-gray-200 rounded overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                {resolvedBets.map(bet => {
                  const market = queries.getMarketById(bet.market_id) as any;
                  const isProfit = (bet.pnl || 0) > 0;
                  const action = bet.status === 'sold' ? 'Sold' : bet.status === 'won' ? 'Won' : 'Lost';

                  return (
                    <div key={bet.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{market?.question || 'Unknown market'}</div>
                          <div className="text-sm text-gray-600">
                            {action} • {bet.side} @ {(bet.price * 100).toFixed(0)}%
                            {bet.confidence && ` • ${(bet.confidence * 100).toFixed(0)}% confidence`}
                          </div>
                          {bet.reasoning && (
                            <div className="text-sm text-gray-500 mt-1 italic">
                              "{bet.reasoning.substring(0, 100)}{bet.reasoning.length > 100 ? '...' : ''}"
                            </div>
                          )}
                        </div>
                        <div className={`font-bold ${isProfit ? 'positive' : 'negative'}`}>
                          {isProfit ? '+' : ''}${(bet.pnl || 0).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Decision Patterns */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold mb-4">🧠 DECISION PATTERNS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="border border-accent-primary rounded p-6 hover:shadow-lg transition-all duration-200">
              <h3 className="font-bold mb-4">Performance Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Confidence:</span>
                  <span className="font-bold">{avgConfidence}{avgConfidence !== 'N/A' ? '%' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Win Rate:</span>
                  <span className="font-bold">{winRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Bets:</span>
                  <span className="font-bold">{agent.total_bets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Positions:</span>
                  <span className="font-bold">{agent.pending_bets}</span>
                </div>
              </div>
            </div>

            <div className="border border-accent-primary rounded p-6 hover:shadow-lg transition-all duration-200">
              <h3 className="font-bold mb-4">Category Performance</h3>
              {Object.keys(categoryStats).length === 0 ? (
                <div className="text-gray-600 text-sm">No category data yet</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(categoryStats)
                    .sort((a, b) => b[1].pl - a[1].pl)
                    .map(([category, stats]) => (
                      <div key={category} className="flex justify-between">
                        <span className="text-gray-600 capitalize">{category}:</span>
                        <span className={`font-bold ${stats.pl >= 0 ? 'positive' : 'negative'}`}>
                          {stats.pl >= 0 ? '+' : ''}${stats.pl.toFixed(0)}
                          <span className="text-sm text-gray-500 ml-1">({stats.count})</span>
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
