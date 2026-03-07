import type { KeyboardEvent } from 'react';
import { formatUsd } from '@/lib/format/display';
import type { Trade } from '@/features/cohorts/model-detail/types';
import {
  formatAgentCohortDate,
  getLinkedRowProps,
  getSideBadgeClass,
  getTradeBadgeClass
} from '@/features/cohorts/model-detail/utils';

interface TradeHistoryPanelProps {
  trades: Trade[];
  tradeCount: number;
  onNavigate: (href: string) => void;
}

export function TradeHistoryPanel({
  trades,
  tradeCount,
  onNavigate
}: TradeHistoryPanelProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>, href?: string) {
    if (!href) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onNavigate(href);
    }
  }

  return (
    <div className="glass-card p-6 mb-8">
      <h3 className="text-lg font-semibold mb-4">
        Trade History ({tradeCount})
      </h3>

      {trades.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-8">
          No trades yet
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Side</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Week</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 20).map((trade) => {
                const decisionHref = trade.decision_id ? `/decisions/${trade.decision_id}` : undefined;

                return (
                  <tr
                    key={trade.id}
                    onClick={() => decisionHref && onNavigate(decisionHref)}
                    onKeyDown={(event) => handleKeyDown(event, decisionHref)}
                    {...getLinkedRowProps(decisionHref)}
                  >
                    <td className="text-sm">{formatAgentCohortDate(trade.timestamp)}</td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded ${getTradeBadgeClass(trade.trade_type)}`}>
                        {trade.trade_type}
                      </span>
                    </td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded ${getSideBadgeClass(trade.side)}`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="text-right font-mono">{formatUsd(trade.total_amount)}</td>
                    <td className="text-right text-[var(--text-muted)]">{trade.decision_week}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
