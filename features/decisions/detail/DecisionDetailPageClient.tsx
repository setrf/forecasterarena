'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useDecisionDetailData } from '@/features/decisions/detail/useDecisionDetailData';
import type { DecisionDetailData, Trade } from '@/features/decisions/detail/types';
import { formatDisplayDateTime } from '@/lib/utils';

function parseDecisionJson(rawDecision: DecisionDetailData['decision']): Record<string, unknown> {
  if (typeof rawDecision.parsed_response !== 'string' || rawDecision.parsed_response.trim() === '') {
    return {};
  }

  try {
    const parsed = JSON.parse(rawDecision.parsed_response) as unknown;
    return parsed !== null && typeof parsed === 'object'
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return { error: 'Failed to parse decision JSON' };
  }
}

interface DecisionDetailPageClientProps {
  initialData?: DecisionDetailData | null;
  decisionId?: string;
}

export default function DecisionDetailPageClient({
  initialData = null,
  decisionId
}: DecisionDetailPageClientProps = {}) {
  const params = useParams<{ id: string }>();
  const id = decisionId ?? params.id;
  const { data, loading, error } = useDecisionDetailData(id, initialData);
  const decision = data?.decision ?? null;
  const trades = data?.trades ?? [];

  if (loading) {
    return (
      <div className="container-wide mx-auto px-6 py-20 text-center text-[var(--text-muted)]">
        Loading decision...
      </div>
    );
  }

  if (error || !decision) {
    return (
      <div className="container-wide mx-auto px-6 py-20 text-center">
        <h1 className="heading-block mb-4">{error || 'Decision Not Found'}</h1>
        <Link href="/markets" className="btn btn-primary">
          Back to Markets
        </Link>
      </div>
    );
  }

  const decisionJson = parseDecisionJson(decision);

  const primaryTrade: Trade | null = trades[0] ?? null;
  const primaryMarketQuestion = primaryTrade?.market_question || 'General Strategy / Hold';
  const actionLabel = typeof decisionJson.action === 'string' ? decisionJson.action : (trades.length > 0 ? 'BET' : 'HOLD');
  const backToMarketHref = primaryTrade?.market_id ? `/markets/${primaryTrade.market_id}` : '/markets';

  return (
    <div className="container-wide mx-auto px-6 py-12">
      <Link
        href={backToMarketHref}
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Market
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: decision.model_color }}
          >
            {decision.model_name.substring(0, 2)}
          </div>
          <div>
            <h2 className="heading-card">{decision.model_name}</h2>
            <p className="text-sm text-[var(--text-muted)]">{decision.model_provider}</p>
          </div>
          <div className="ml-auto text-right text-sm text-[var(--text-muted)]">
            {formatDisplayDateTime(decision.created_at)}
          </div>
        </div>

        <h1 className="heading-detail mb-2">
          Decision on: <span className="text-[var(--text-primary)]">{primaryMarketQuestion}</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-6">
            <h3 className="heading-card mb-4">Decision Summary</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="metric-tile">
                <p className="metric-tile__label">Action</p>
                <p className={`metric-tile__value ${actionLabel === 'BET' ? 'text-positive' : actionLabel === 'SELL' ? 'text-negative' : ''}`}>
                  {actionLabel}
                </p>
              </div>
              <div className="metric-tile">
                <p className="metric-tile__label">Trades</p>
                <p className="metric-tile__value">{trades.length}</p>
              </div>
              <div className="metric-tile">
                <p className="metric-tile__label">Family</p>
                <p className="metric-tile__value text-lg md:text-xl leading-tight">{decision.model_name}</p>
                {decision.model_release_name && (
                  <p className="metric-tile__meta">{decision.model_release_name}</p>
                )}
              </div>
              <div className="metric-tile">
                <p className="metric-tile__label">Logged</p>
                <p className="metric-tile__value text-lg md:text-xl leading-tight">{formatDisplayDateTime(decision.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="heading-block mb-4">Rationale</h3>
            <div className="prose prose-invert max-w-none text-[var(--text-secondary)] whitespace-pre-wrap">
              {decision.reasoning}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="heading-card mb-4">Action Taken</h3>

            <div className="flex items-center justify-between mb-6">
              <div className={`text-2xl font-bold ${actionLabel === 'BET' ? 'text-positive' : actionLabel === 'SELL' ? 'text-negative' : 'text-[var(--text-muted)]'}`}>
                {actionLabel}
              </div>
            </div>

            {trades.length > 0 ? (
              <div className="space-y-6">
                {trades.map((trade, index) => (
                  <div key={trade.id} className={`space-y-3 ${index > 0 ? 'pt-4 border-t border-[var(--border-primary)]' : ''}`}>
                    {trades.length > 1 && (
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {trade.market_question}
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">Side</span>
                      <div className={`badge ${trade.side === 'YES' ? 'badge-active' : 'badge-pending'}`}>
                        {trade.side}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Amount</span>
                      <span className="font-mono">${trade.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Shares</span>
                      <span className="font-mono">{trade.shares.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Price</span>
                      <span className="font-mono">{(trade.price * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--text-muted)] text-sm">
                No trade executed for this decision (likely HOLD or insufficient funds).
              </p>
            )}
          </div>

          <div className="glass-card p-6">
            <details>
              <summary className="list-none cursor-pointer text-sm font-semibold text-[var(--text-muted)] flex items-center justify-between">
                <span>Inspect Raw Output</span>
                <span className="text-xs text-[var(--text-secondary)]">Expand JSON</span>
              </summary>
              <pre className="mt-4 bg-[var(--bg-tertiary)] p-3 rounded text-xs overflow-x-auto text-[var(--text-secondary)]">
                {JSON.stringify(decisionJson, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
