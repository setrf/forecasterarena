'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Decision {
    id: string;
    market_id: string;
    agent_id: string;
    parsed_response: string; // JSON string
    reasoning: string;
    created_at: string;
    model_name: string;
    model_color: string;
    model_provider: string;
}

interface Trade {
    id: string;
    trade_type: string;
    side: string;
    shares: number;
    price: number;
    total_amount: number;
    executed_at: string;
    market_question: string;
    market_slug: string | null;
    market_event_slug: string | null;
    market_id: string;
}

export default function DecisionPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;
    const [decision, setDecision] = useState<Decision | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/decisions/${id}`);
                if (!res.ok) {
                    setError('Decision not found');
                    return;
                }
                const data = await res.json();
                setDecision(data.decision);
                setTrades(data.trades || []);
            } catch (err) {
                setError('Failed to load decision');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [id]);

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
                <h1 className="text-2xl font-bold mb-4">{error || 'Decision Not Found'}</h1>
                <a href="/markets" className="btn btn-primary">
                    Back to Markets
                </a>
            </div>
        );
    }

    let decisionJson;
    try {
        decisionJson = JSON.parse(decision.parsed_response);
    } catch (e) {
        decisionJson = { action: 'UNKNOWN', error: 'Failed to parse decision JSON' };
    }

    // Determine the primary market question to display
    const primaryMarketQuestion = trades.length > 0
        ? trades[0].market_question
        : 'General Strategy / Hold';

    return (
        <div className="container-wide mx-auto px-6 py-12">
            {/* Back link */}
            <a
                href={trades.length > 0 ? `/markets/${trades[0].market_id}` : '/markets'}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 mb-6"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Market
            </a>

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: decision.model_color }}
                    >
                        {decision.model_name.substring(0, 2)}
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg">{decision.model_name}</h2>
                        <p className="text-sm text-[var(--text-muted)]">{decision.model_provider}</p>
                    </div>
                    <div className="ml-auto text-sm text-[var(--text-muted)]">
                        {new Date(decision.created_at).toLocaleString()}
                    </div>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    Decision on: <span className="text-[var(--text-primary)]">{primaryMarketQuestion}</span>
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Reasoning */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-semibold mb-4">Rationale</h3>
                        <div className="prose prose-invert max-w-none text-[var(--text-secondary)] whitespace-pre-wrap">
                            {decision.reasoning}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Action Details */}
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-4">Action Taken</h3>

                        <div className="flex items-center justify-between mb-6">
                            <div className={`text-2xl font-bold ${decisionJson.action === 'BET' ? 'text-positive' : 'text-[var(--text-muted)]'
                                }`}>
                                {decisionJson.action}
                            </div>
                        </div>

                        {trades.length > 0 ? (
                            <div className="space-y-6">
                                {trades.map((trade, idx) => (
                                    <div key={trade.id} className={`space-y-3 ${idx > 0 ? 'pt-4 border-t border-[var(--border-primary)]' : ''}`}>
                                        {trades.length > 1 && (
                                            <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
                                                {trade.market_question}
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-[var(--text-muted)]">Side</span>
                                            <div className={`badge ${trade.side === 'YES' ? 'badge-active' : 'badge-pending'
                                                }`}>
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

                    {/* Raw Decision Data (Debug/Transparency) */}
                    <div className="glass-card p-6">
                        <h3 className="text-sm font-semibold mb-2 text-[var(--text-muted)]">Raw Output</h3>
                        <pre className="bg-[var(--bg-tertiary)] p-3 rounded text-xs overflow-x-auto text-[var(--text-secondary)]">
                            {JSON.stringify(decisionJson, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
