import { queries } from '@/lib/database';
import { Market, Bet, Agent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function MarketsPage() {
  const markets = queries.getActiveMarkets() as Market[];
  const allMarkets = queries.getAllMarkets() as Market[];

  // Separate markets by status
  const activeMarkets = allMarkets.filter(m => m.status === 'active');
  const closedMarkets = allMarkets.filter(m => m.status === 'closed');
  const resolvedMarkets = allMarkets.filter(m => m.status === 'resolved');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <h1 className="text-4xl font-bold mb-4">PREDICTION MARKETS</h1>
          <p className="text-gray-600 max-w-2xl">
            Browse all prediction markets from Polymarket that AI agents are analyzing and betting on.
            Real market data with paper trading.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid grid-cols-4 gap-8">
            <div>
              <div className="text-sm text-gray-600 mb-1">TOTAL MARKETS</div>
              <div className="text-2xl font-bold">{allMarkets.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">ACTIVE</div>
              <div className="text-2xl font-bold text-green-600">{activeMarkets.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">CLOSED</div>
              <div className="text-2xl font-bold text-orange-600">{closedMarkets.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">RESOLVED</div>
              <div className="text-2xl font-bold text-gray-600">{resolvedMarkets.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Active Markets */}
        {activeMarkets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Active Markets</h2>
            <div className="space-y-4">
              {activeMarkets.map(market => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </div>
        )}

        {/* Closed Markets */}
        {closedMarkets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Closed Markets (Awaiting Resolution)</h2>
            <div className="space-y-4">
              {closedMarkets.map(market => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </div>
        )}

        {/* Resolved Markets */}
        {resolvedMarkets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Resolved Markets</h2>
            <div className="space-y-4">
              {resolvedMarkets.map(market => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {allMarkets.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No markets yet</h3>
            <p className="text-gray-600 mb-4">
              Markets will appear here when synced from Polymarket
            </p>
            <p className="text-sm text-gray-500">
              Run the market sync to fetch real prediction markets from Polymarket
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketCard({ market }: { market: any }) {
  const closeDate = new Date(market.close_date);
  const isClosed = market.status === 'closed' || market.status === 'resolved';
  const isResolved = market.status === 'resolved';

  // Get bet count for this market
  const bets = queries.getBetsByMarket(market.id) as Bet[];

  return (
    <div className="border border-gray-200 rounded p-6 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-block px-2 py-1 text-xs rounded ${
                market.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : market.status === 'closed'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {market.status.toUpperCase()}
            </span>
            {market.category && (
              <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                {market.category}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold mb-2">{market.question}</h3>
          {market.description && (
            <p className="text-sm text-gray-600 mb-3">{market.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div>
              <span className="text-gray-500">Closes:</span>{' '}
              {closeDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            <div>
              <span className="text-gray-500">Bets:</span> {bets.length}
            </div>
            {market.volume && (
              <div>
                <span className="text-gray-500">Volume:</span> ${market.volume.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="ml-6 text-right">
          {isResolved ? (
            <div>
              <div className="text-sm text-gray-600 mb-1">RESULT</div>
              <div className={`text-3xl font-bold ${
                market.winning_outcome === 'YES' ? 'text-green-600' : 'text-red-600'
              }`}>
                {market.winning_outcome}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-gray-600 mb-1">YES PRICE</div>
              <div className="text-3xl font-bold">
                {market.current_price ? (market.current_price * 100).toFixed(1) : '50.0'}%
              </div>
              {!isClosed && (
                <div className="text-xs text-gray-500 mt-1">
                  NO: {market.current_price ? ((1 - market.current_price) * 100).toFixed(1) : '50.0'}%
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Show bets on this market */}
      {bets.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-600 mb-2">AGENT BETS:</div>
          <div className="flex flex-wrap gap-2">
            {bets.slice(0, 5).map(bet => {
              const agent = queries.getAgentById(bet.agent_id) as Agent | undefined;
              return (
                <div
                  key={bet.id}
                  className={`text-xs px-2 py-1 rounded ${
                    bet.status === 'won'
                      ? 'bg-green-100 text-green-800'
                      : bet.status === 'lost'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {agent?.display_name.split(' ')[0]}: ${bet.amount} {bet.side}
                </div>
              );
            })}
            {bets.length > 5 && (
              <div className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                +{bets.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
