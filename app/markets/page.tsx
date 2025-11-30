'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Market {
  id: string;
  polymarket_id: string;
  question: string;
  category: string | null;
  market_type: string;
  current_price: number | null;
  volume: number | null;
  close_date: string;
  status: string;
  positions_count: number;
}

type SortOption = 'volume' | 'close_date' | 'created';
type StatusOption = 'active' | 'closed' | 'resolved' | 'all';

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Filters
  const [status, setStatus] = useState<StatusOption>('active');
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('volume');
  const [offset, setOffset] = useState(0);

  const fetchMarkets = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('status', status);
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      params.set('sort', sort);
      params.set('limit', '50');
      params.set('offset', reset ? '0' : String(offset));
      
      const res = await fetch(`/api/markets?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (reset) {
          setMarkets(data.markets);
          setOffset(50);
        } else {
          setMarkets(prev => [...prev, ...data.markets]);
          setOffset(prev => prev + 50);
        }
        setTotal(data.total);
        setHasMore(data.has_more);
        if (data.categories) setCategories(data.categories);
      }
    } catch {
      console.log('Error fetching markets');
    } finally {
      setLoading(false);
    }
  }, [status, category, search, sort, offset]);

  useEffect(() => {
    fetchMarkets(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, category, sort]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) {
        fetchMarkets(true);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function formatVolume(volume: number | null): string {
    if (!volume) return 'N/A';
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`;
    return `$${volume.toFixed(0)}`;
  }

  function formatPrice(price: number | null): string {
    if (price === null) return '50%';
    return `${(price * 100).toFixed(0)}%`;
  }

  function formatCloseDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Closed';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.ceil(days / 7)}w`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Count stats
  const activeCount = markets.filter(m => m.status === 'active').length;
  const withPositions = markets.filter(m => m.positions_count > 0).length;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative border-b border-[var(--border-subtle)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)]" />
        <div className="container-wide mx-auto px-6 py-16 relative z-10">
          <p className="text-[var(--accent-gold)] font-mono text-sm tracking-wider mb-2">POLYMARKET DATA</p>
          <h1 className="text-4xl md:text-5xl mb-4">
            Prediction <span className="font-serif-italic">Markets</span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl text-lg">
            Browse markets synced from Polymarket. LLM agents analyze these markets
            and make betting decisions.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            <div className="stat-card">
              <p className="text-3xl font-bold">{total}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Total Markets</p>
            </div>
            <div className="stat-card">
              <p className="text-3xl font-bold text-[var(--color-positive)]">{activeCount}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Active</p>
            </div>
            <div className="stat-card">
              <p className="text-3xl font-bold text-[var(--accent-blue)]">{withPositions}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">With Positions</p>
            </div>
            <div className="stat-card">
              <p className="text-3xl font-bold">{categories.length}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Categories</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
        <div className="container-wide mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[240px] max-w-md relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search markets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:border-[var(--accent-gold)] focus:outline-none transition-colors"
              />
            </div>
            
            <div className="flex items-center gap-2">
              {/* Status */}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusOption)}
                className="px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="resolved">Resolved</option>
                <option value="all">All Status</option>
              </select>
              
              {/* Category */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none cursor-pointer"
              >
                <option value="volume">Volume</option>
                <option value="close_date">Close Date</option>
                <option value="created">Recent</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Markets Grid */}
      <section className="container-wide mx-auto px-6 py-10">
        {loading && markets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[var(--text-muted)]">Loading markets...</p>
          </div>
        ) : markets.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xl font-medium mb-2">No markets found</p>
            <p className="text-[var(--text-muted)]">Try adjusting your filters or sync markets first</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {markets.map((market, i) => {
                const yesPrice = market.current_price ?? 0.5;
                const noPrice = 1 - yesPrice;
                
                return (
                  <Link
                    key={market.id}
                    href={`/markets/${market.id}`}
                    className="card p-5 group animate-fade-in"
                    style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {market.status === 'active' && (
                          <span className="w-2 h-2 rounded-full bg-[var(--color-positive)]" />
                        )}
                        <span className="text-xs font-mono text-[var(--text-muted)] uppercase">
                          {market.status}
                        </span>
                      </div>
                      {market.positions_count > 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-[var(--accent-gold-dim)] text-[var(--accent-gold)]">
                          {market.positions_count} position{market.positions_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    
                    {/* Question */}
                    <h3 className="font-medium leading-snug mb-5 line-clamp-2 min-h-[2.75rem] group-hover:text-[var(--accent-gold)] transition-colors">
                      {market.question}
                    </h3>
                    
                    {/* Price Visualization */}
                    <div className="space-y-3 mb-5">
                      {/* YES */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono w-8 text-[var(--color-positive)]">YES</span>
                        <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-[var(--color-positive)] to-[#00ff9d]"
                            style={{ width: `${yesPrice * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono w-12 text-right">{formatPrice(yesPrice)}</span>
                      </div>
                      {/* NO */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono w-8 text-[var(--color-negative)]">NO</span>
                        <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-[var(--color-negative)] to-[#ff8a8a]"
                            style={{ width: `${noPrice * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono w-12 text-right">{formatPrice(noPrice)}</span>
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                      <span className="px-2 py-1 rounded bg-[var(--bg-tertiary)]">
                        {market.category || 'General'}
                      </span>
                      <span className="font-mono">{formatVolume(market.volume)}</span>
                      <span>
                        {formatCloseDate(market.close_date)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
            
            {/* Load more */}
            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={() => fetchMarkets(false)}
                  disabled={loading}
                  className="btn btn-secondary"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Load More Markets'
                  )}
                </button>
              </div>
            )}
            
            <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
              Showing {markets.length} of {total} markets
            </p>
          </>
        )}
      </section>
    </div>
  );
}
