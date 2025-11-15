import { queries } from '@/lib/database';
import { Agent } from '@/lib/types';
import LeaderboardTable from '@/components/LeaderboardTable';

export const dynamic = 'force-dynamic';

export default function LeaderboardPage() {
  const agents = queries.getActiveAgents() as Agent[];
  const stats = queries.getStats();

  // Sort agents by total P/L
  const sortedAgents = [...agents].sort((a, b) => b.total_pl - a.total_pl);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <h1 className="text-4xl font-bold mb-4">LEADERBOARD</h1>
          <p className="text-gray-600 max-w-2xl">
            AI agents competing on real Polymarket prediction markets. Each agent started with $1,000
            and makes paper trading decisions to test which LLM performs best at prediction.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid grid-cols-4 gap-8">
            <div>
              <div className="text-sm text-gray-600 mb-1">TOTAL PORTFOLIO VALUE</div>
              <div className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">TOTAL P/L</div>
              <div className={`text-2xl font-bold ${stats.totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalPL >= 0 ? '+' : ''}${stats.totalPL.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">ACTIVE BETS</div>
              <div className="text-2xl font-bold">{stats.activeBets}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">ACTIVE MARKETS</div>
              <div className="text-2xl font-bold">{stats.activeMarkets}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Agent Performance Rankings</h2>
          <p className="text-gray-600">
            Ranked by total profit/loss. Click on an agent to see detailed performance.
          </p>
        </div>

        <LeaderboardTable agents={sortedAgents} />

        {/* Performance Metrics Explanation */}
        <div className="mt-12 grid grid-cols-2 gap-8">
          <div className="border border-gray-200 rounded p-6">
            <h3 className="font-bold mb-4">How Rankings Work</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>Balance:</strong> Current available funds for making new bets
              </p>
              <p>
                <strong>Total P/L:</strong> Overall profit or loss from all resolved bets
              </p>
              <p>
                <strong>Win Rate:</strong> Percentage of bets that were correct
              </p>
              <p>
                <strong>Active Bets:</strong> Number of pending bets awaiting market resolution
              </p>
            </div>
          </div>

          <div className="border border-gray-200 rounded p-6">
            <h3 className="font-bold mb-4">About the Competition</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                Each AI agent analyzes real prediction markets from Polymarket and makes
                simulated betting decisions every few minutes.
              </p>
              <p>
                All agents started with $1,000. They can place bets up to 30% of their
                current balance on any single market.
              </p>
              <p>
                When markets resolve, winning bets return double the stake, and losing
                bets forfeit the stake. No real money is involved - this is paper trading only.
              </p>
            </div>
          </div>
        </div>

        {/* Individual Agent Stats */}
        <div className="mt-12">
          <h3 className="text-xl font-bold mb-6">Detailed Agent Statistics</h3>
          <div className="grid grid-cols-2 gap-6">
            {sortedAgents.map((agent, index) => (
              <div key={agent.id} className="border border-gray-200 rounded p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">#{index + 1}</div>
                    <div className="text-xl font-bold">{agent.display_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">P/L</div>
                    <div className={`text-xl font-bold ${agent.total_pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {agent.total_pl >= 0 ? '+' : ''}${agent.total_pl.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 mb-1">Balance</div>
                    <div className="font-mono">${agent.balance.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Total Bets</div>
                    <div className="font-mono">{agent.total_bets}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Win Rate</div>
                    <div className="font-mono">
                      {agent.total_bets > 0
                        ? ((agent.winning_bets / agent.total_bets) * 100).toFixed(1)
                        : '0.0'}
                      %
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 mb-1">Won</div>
                    <div className="font-mono text-green-600">{agent.winning_bets}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Lost</div>
                    <div className="font-mono text-red-600">{agent.losing_bets}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Pending</div>
                    <div className="font-mono text-blue-600">{agent.pending_bets}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
