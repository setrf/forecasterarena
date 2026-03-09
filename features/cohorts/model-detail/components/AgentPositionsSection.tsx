import type { KeyboardEvent } from 'react';
import { formatSignedUsd, formatUsd } from '@/lib/format/display';
import type { ClosedPosition, Position } from '@/features/cohorts/model-detail/types';
import {
  getLinkedRowProps,
  getOutcomeBadgeClass,
  getSideBadgeClass
} from '@/features/cohorts/model-detail/utils';

interface AgentPositionsSectionProps {
  positions: Position[];
  closedPositions: ClosedPosition[];
  positionCount: number;
  onNavigate: (href: string) => void;
}

export function AgentPositionsSection({
  positions,
  closedPositions,
  positionCount,
  onNavigate
}: AgentPositionsSectionProps) {
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          Open Positions ({positionCount})
        </h3>

        {positions.length === 0 ? (
          <p className="text-[var(--text-muted)] text-center py-8">
            No open positions
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Side</th>
                  <th className="text-right">Shares</th>
                  <th className="text-right">Entry</th>
                  <th className="text-right">P/L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const currentValue = position.current_value ?? position.shares * position.current_price;
                  const unrealizedPnl = position.unrealized_pnl ?? (currentValue - position.shares * position.avg_entry_price);
                  const decisionHref = position.opening_decision_id
                    ? `/decisions/${position.opening_decision_id}`
                    : undefined;

                  return (
                    <tr
                      key={position.id}
                      onClick={() => decisionHref && onNavigate(decisionHref)}
                      onKeyDown={(event) => handleKeyDown(event, decisionHref)}
                      {...getLinkedRowProps(decisionHref)}
                    >
                      <td className="max-w-[200px] truncate" title={position.market_question}>
                        <div className="flex flex-col">
                          <span>{position.market_question}</span>
                          {decisionHref && (
                            <span className="text-xs text-[var(--accent-gold)]">View opening decision →</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded ${getSideBadgeClass(position.side)}`}>
                          {position.side}
                        </span>
                      </td>
                      <td className="text-right font-mono">{position.shares.toFixed(0)}</td>
                      <td className="text-right font-mono">{(position.avg_entry_price * 100).toFixed(1)}%</td>
                      <td className={`text-right font-mono ${unrealizedPnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {formatSignedUsd(unrealizedPnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          Closed Positions ({closedPositions.length})
        </h3>

        {closedPositions.length === 0 ? (
          <p className="text-[var(--text-muted)] text-center py-8">
            No closed positions
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Side</th>
                  <th className="text-right">Outcome</th>
                  <th className="text-right">P/L</th>
                </tr>
              </thead>
              <tbody>
                {closedPositions.map((position) => {
                  const decisionHref = position.opening_decision_id
                    ? `/decisions/${position.opening_decision_id}`
                    : undefined;
                  const pnl = position.pnl ?? 0;

                  return (
                    <tr
                      key={position.id}
                      onClick={() => decisionHref && onNavigate(decisionHref)}
                      onKeyDown={(event) => handleKeyDown(event, decisionHref)}
                      {...getLinkedRowProps(decisionHref)}
                    >
                      <td className="max-w-[150px] truncate" title={position.market_question}>
                        <div className="flex flex-col">
                          <span>{position.market_question}</span>
                          {decisionHref && (
                            <span className="text-xs text-[var(--accent-gold)]">View opening decision →</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded ${getSideBadgeClass(position.side)}`}>
                          {position.side}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded ${getOutcomeBadgeClass(position.outcome)}`}>
                          {position.outcome}
                        </span>
                      </td>
                      <td className={`text-right font-mono text-sm ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {position.outcome === 'PENDING' ? '-' : formatSignedUsd(pnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
