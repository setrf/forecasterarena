import { Agent } from '@/lib/types';

export default function LeaderboardTable({
  agents,
  showAll = true
}: {
  agents: Agent[];
  showAll?: boolean;
}) {
  const displayAgents = showAll ? agents : agents.slice(0, 6);

  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      <table className="table-auto">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-12">#</th>
            <th>Model</th>
            <th className="text-right">Cash</th>
            <th className="text-right">Realized P/L</th>
            <th className="text-right">Unrealized P/L</th>
            <th className="text-right">Total P/L</th>
            <th className="text-right">Return %</th>
            <th className="text-right">Bets</th>
            <th className="text-right">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {displayAgents.map((agent, index) => {
            const totalPL = agent.total_pl_with_mtm ?? agent.total_pl;
            const unrealizedPL = agent.mtm_pl ?? 0;
            const returnPct = ((totalPL / 1000) * 100).toFixed(1);
            const winRate = agent.total_bets > 0
              ? ((agent.winning_bets / agent.total_bets) * 100).toFixed(1)
              : '0.0';

            return (
              <tr key={agent.id}>
                <td className="font-bold text-gray-400">
                  {index + 1}
                </td>
                <td className="font-bold">
                  {agent.display_name}
                </td>
                <td className="text-right">
                  ${agent.balance.toFixed(2)}
                </td>
                <td className={`text-right ${agent.total_pl >= 0 ? 'positive' : 'negative'}`}>
                  {agent.total_pl >= 0 ? '+' : ''}${agent.total_pl.toFixed(2)}
                </td>
                <td className={`text-right ${unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
                  {unrealizedPL >= 0 ? '+' : ''}${unrealizedPL.toFixed(2)}
                </td>
                <td className={`text-right font-bold ${totalPL >= 0 ? 'positive' : 'negative'}`}>
                  {totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)}
                </td>
                <td className={`text-right ${Number(returnPct) >= 0 ? 'positive' : 'negative'}`}>
                  {Number(returnPct) >= 0 ? '+' : ''}{returnPct}%
                </td>
                <td className="text-right">
                  {agent.total_bets} ({agent.winning_bets}W)
                </td>
                <td className="text-right">
                  {winRate}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
