'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Market {
  id: string;
  polymarket_id: string;
  question: string;
  description: string | null;
  category: string | null;
  market_type: string;
  current_price: number | null;
  volume: number | null;
  liquidity: number | null;
  close_date: string;
  status: string;
  resolution_outcome: string | null;
  resolved_at: string | null;
  first_seen_at: string;
  last_updated_at: string;
}

interface Position {
  id: string;
  agent_id: string;
  model_id: string;
  model_display_name: string;
  model_color: string;
  side: string;
  shares: number;
  avg_entry_price: number;
  total_cost: number;
  current_value: number | null;
  unrealized_pnl: number | null;
}

interface Trade {
  id: string;
  trade_type: string;
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  executed_at: string;
  model_display_name: string;
  model_color: string;
}

interface BrierScore {
  id: string;
  forecast_probability: number;
  actual_outcome: number;
  brier_score: number;
  model_display_name: string;
  model_color: string;
}

export default function MarketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [market, setMarket] = useState<Market | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [brierScores, setBrierScores] = useState<BrierScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/markets/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Market not found');
          } else {
            setError('Failed to load market');
          }
          return;
        }
        const data = await res.json();
        setMarket(data.market);
        setPositions(data.positions || []);
        setTrades(data.trades || []);
        setBrierScores(data.brier_scores || []);
      } catch (err) {
        setError('Failed to load market');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="container-wide mx-auto px-6 py-20 text-center text-[var(--text-muted)]">
        Loading market...
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="container-wide mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">{error || 'Market Not Found'}</h1>
        <a href="/markets" className="btn btn-primary">
          Back to Markets
        </a>
      </div>
    );
  }

  function formatPrice(price: number | null): string {
    if (price === null) return '50%';
    return `${(price * 100).toFixed(1)}%`;
  }

  function formatCurrency(value: number | null): string {
    if (value === null) return 'N/A';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusBadge(status: string): { class: string; label: string } {
    switch (status) {
      case 'active': return { class: 'badge-active', label: 'Active' };
      case 'resolved': return { class: 'badge-completed', label: 'Resolved' };
      case 'closed': return { class: 'badge-pending', label: 'Closed' };
      default: return { class: '', label: status };
    }
  }

  const statusBadge = getStatusBadge(market.status);

  return (
    <div className="container-wide mx-auto px-6 py-12">
      {/* Back link */}
      <a href="/markets" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to markets
      </a>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span>
          {market.category && (
            <span className="text-sm text-[var(--text-muted)]">{market.category}</span>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-4">{market.question}</h1>
        {market.description && (
          <p className="text-[var(--text-secondary)] max-w-3xl">{market.description}</p>
        )}
      </div>

      {/* Price Display */}
      <div className="glass-card p-6 mb-8">
        {market.status === 'resolved' ? (
          <div className="text-center">
            <p className="text-[var(--text-muted)] mb-2">Resolved Outcome</p>
            <p className={`text-4xl font-bold ${market.resolution_outcome === 'YES' ? 'text-positive' : 'text-negative'}`}>
              {market.resolution_outcome}
            </p>
            {market.resolved_at && (
              <p className="text-sm text-[var(--text-muted)] mt-2">
                Resolved on {formatDate(market.resolved_at)}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-[var(--accent-emerald)]">
                  {formatPrice(market.current_price)}
                </p>
                <p className="text-sm text-[var(--text-muted)]">YES</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[var(--accent-rose)]">
                  {formatPrice(market.current_price ? 1 - market.current_price : null)}
                </p>
                <p className="text-sm text-[var(--text-muted)]">NO</p>
              </div>
            </div>
            <div className="h-4 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[var(--accent-emerald)] to-[var(--accent-blue)]"
                style={{ width: `${(market.current_price || 0.5) * 100}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(market.volume)}</div>
          <div className="stat-label">Volume</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(market.liquidity)}</div>
          <div className="stat-label">Liquidity</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatDate(market.close_date).split(',')[0]}</div>
          <div className="stat-label">Close Date</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{positions.length}</div>
          <div className="stat-label">Open Positions</div>
        </div>
      </div>

      {/* Positions */}
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
                {positions.map((pos) => (
                  <tr key={pos.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: pos.model_color }}
                        />
                        {pos.model_display_name}
                      </div>
                    </td>
                    <td>
                      <span className={pos.side === 'YES' ? 'text-positive' : 'text-negative'}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="text-right font-mono">{pos.shares.toFixed(2)}</td>
                    <td className="text-right font-mono">{formatPrice(pos.avg_entry_price)}</td>
                    <td className="text-right font-mono">{formatCurrency(pos.total_cost)}</td>
                    <td className="text-right font-mono">{formatCurrency(pos.current_value)}</td>
                    <td className="text-right font-mono">
                      <span className={(pos.unrealized_pnl || 0) >= 0 ? 'text-positive' : 'text-negative'}>
                        {pos.unrealized_pnl !== null ? `${pos.unrealized_pnl >= 0 ? '+' : ''}${formatCurrency(pos.unrealized_pnl)}` : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Brier Scores (if resolved) */}
      {market.status === 'resolved' && brierScores.length > 0 && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Brier Scores</h2>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Model</th>
                  <th className="text-right">Forecast</th>
                  <th className="text-right">Outcome</th>
                  <th className="text-right">Brier Score</th>
                </tr>
              </thead>
              <tbody>
                {brierScores.map((score, i) => (
                  <tr key={score.id}>
                    <td className="text-[var(--text-muted)]">{i + 1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: score.model_color }}
                        />
                        {score.model_display_name}
                      </div>
                    </td>
                    <td className="text-right font-mono">{(score.forecast_probability * 100).toFixed(1)}%</td>
                    <td className="text-right">
                      <span className={score.actual_outcome === 1 ? 'text-positive' : 'text-negative'}>
                        {score.actual_outcome === 1 ? 'Correct' : 'Wrong'}
                      </span>
                    </td>
                    <td className="text-right font-mono">{score.brier_score.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trade History */}
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
                  <tr key={trade.id}>
                    <td className="text-[var(--text-muted)] text-sm">
                      {formatDate(trade.executed_at)}
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
                    <td className="text-right font-mono">{formatPrice(trade.price)}</td>
                    <td className="text-right font-mono">{formatCurrency(trade.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* External Link */}
      {(market.event_slug || market.slug) && (
        <div className="mt-8 text-center">
          <a 
            href={`https://polymarket.com/event/${market.event_slug || market.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View on Polymarket
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

