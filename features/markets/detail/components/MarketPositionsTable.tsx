import type { KeyboardEvent } from 'react';
import { formatProbabilityPercent, formatSignedUsd, formatUsd } from '@/lib/format/display';
import type { MarketPosition } from '@/features/markets/detail/types';

interface MarketPositionsTableProps {
  positions: MarketPosition[];
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

export function MarketPositionsTable({
  positions,
  onNavigateToDecision
}: MarketPositionsTableProps) {
  return (
    <div className="glass-card p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">Agent Positions</h2>
      {positions.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-8">
          No agents have positions on this market
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Side</th>
                <th className="text-right">Shares</th>
                <th className="text-right">Entry Price</th>
                <th className="text-right">Cost</th>
                <th className="text-right">Value</th>
                <th className="text-right">P/L</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr
                  key={position.id}
                  className={`border-b border-[var(--border-subtle)] last:border-0 ${position.decision_id && position.decision_id.length > 5 ? 'cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors' : ''}`}
                  onClick={() => position.decision_id && onNavigateToDecision(position.decision_id)}
                  onKeyDown={(event) => handleKeyDown(event, position.decision_id, onNavigateToDecision)}
                  role={position.decision_id ? 'link' : undefined}
                  tabIndex={position.decision_id ? 0 : undefined}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: position.model_color }}
                      />
                      <div className="flex flex-col">
                        <span>{position.model_display_name}</span>
                        {position.decision_id && (
                          <span className="text-xs text-[var(--accent-gold)]">View decision →</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={position.side === 'YES' ? 'text-positive' : 'text-negative'}>
                      {position.side}
                    </span>
                  </td>
                  <td className="text-right font-mono py-3 px-4">{position.shares.toFixed(2)}</td>
                  <td className="text-right font-mono py-3 px-4">{formatProbabilityPercent(position.avg_entry_price)}</td>
                  <td className="text-right font-mono py-3 px-4">{formatUsd(position.total_cost)}</td>
                  <td className="text-right font-mono py-3 px-4">{formatUsd(position.current_value)}</td>
                  <td className="text-right font-mono py-3 px-4">
                    <span className={(position.unrealized_pnl ?? 0) >= 0 ? 'text-positive' : 'text-negative'}>
                      {formatSignedUsd(position.unrealized_pnl)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
