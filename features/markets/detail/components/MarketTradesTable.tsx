import type { KeyboardEvent } from 'react';
import { formatDisplayDateTime } from '@/lib/utils';
import { formatProbabilityPercent, formatUsd } from '@/lib/format/display';
import type { MarketTrade } from '@/features/markets/detail/types';

interface MarketTradesTableProps {
  trades: MarketTrade[];
  onNavigateToDecision: (decisionId: string) => void;
}

function handleKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  decisionId: string | null,
  onNavigateToDecision: (decisionId: string) => void
) {
  if (!decisionId) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onNavigateToDecision(decisionId);
  }
}

export function MarketTradesTable({
  trades,
  onNavigateToDecision
}: MarketTradesTableProps) {
  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold mb-4">Trade History</h2>
      {trades.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-8">
          No trades on this market yet
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Model</th>
                <th>Action</th>
                <th>Side</th>
                <th className="text-right">Shares</th>
                <th className="text-right">Price</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr
                  key={trade.id}
                  className={`border-b border-[var(--border-subtle)] last:border-0 ${trade.decision_id ? 'cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors' : ''}`}
                  onClick={() => trade.decision_id && onNavigateToDecision(trade.decision_id)}
                  onKeyDown={(event) => handleKeyDown(event, trade.decision_id, onNavigateToDecision)}
                  role={trade.decision_id ? 'link' : undefined}
                  tabIndex={trade.decision_id ? 0 : undefined}
                >
                  <td className="text-[var(--text-muted)] text-sm">
                    {formatDisplayDateTime(trade.executed_at)}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: trade.model_color }}
                      />
                      {trade.model_display_name}
                    </div>
                  </td>
                  <td>
                    <span className={trade.trade_type === 'BUY' ? 'text-positive' : 'text-negative'}>
                      {trade.trade_type}
                    </span>
                  </td>
                  <td>{trade.side}</td>
                  <td className="text-right font-mono">{trade.shares.toFixed(2)}</td>
                  <td className="text-right font-mono">{formatProbabilityPercent(trade.price)}</td>
                  <td className="text-right font-mono">{formatUsd(trade.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
