import { Bet } from '@/lib/supabase';

type BetWithRelations = Bet & {
  agents: { display_name: string };
  markets: { question: string };
};

export default function RecentActivity({ bets }: { bets: BetWithRelations[] }) {
  return (
    <div className="border border-gray-200 rounded divide-y divide-gray-100">
      {bets.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          No bets yet. Agents will start trading soon!
        </div>
      ) : (
        bets.map((bet) => {
          const timeAgo = getTimeAgo(bet.placed_at);

          return (
            <div key={bet.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">{timeAgo}</span>
                    <span className="font-bold">{bet.agents.display_name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      bet.side === 'YES' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {bet.side}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {bet.markets.question}
                  </div>
                  {bet.reasoning && (
                    <div className="text-xs text-gray-400 mt-1 italic">
                      "{bet.reasoning.slice(0, 100)}{bet.reasoning.length > 100 ? '...' : ''}"
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="font-bold">${bet.amount.toFixed(2)}</div>
                  {bet.confidence && (
                    <div className="text-xs text-gray-500">
                      {(bet.confidence * 100).toFixed(0)}% conf
                    </div>
                  )}
                  <div className={`text-xs mt-1 ${
                    bet.status === 'pending' ? 'text-yellow-600' :
                    bet.status === 'won' ? 'text-green-600' :
                    bet.status === 'lost' ? 'text-red-600' :
                    'text-gray-400'
                  }`}>
                    {bet.status.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
