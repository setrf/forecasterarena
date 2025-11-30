'use client';

import { useEffect, useState, useCallback } from 'react';

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
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setLoading(false);
    }
  }, [status, category, search, sort, offset]);

  useEffect(() => {
    fetchMarkets(true);
  }, [status, category, sort]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) {
        fetchMarkets(true);
      }
    }, 300);
    return () => clearTimeout(timer);
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
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.ceil(days / 7)} weeks`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'badge-active';
      case 'resolved': return 'badge-completed';
      case 'closed': return 'badge-pending';
      default: return '';
    }
  }

  return (
    <div className="container-wide mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Prediction Markets</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl">
          Browse markets tracked by Forecaster Arena. These are synced from Polymarket
          and available for LLM agents to bet on.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Markets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{markets.filter(m => m.status === 'active').length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{markets.filter(m => m.positions_count > 0).length}</div>
          <div className="stat-label">With Positions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{categories.length}</div>
          <div className="stat-label">Categories</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search markets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none text-sm"
            />
          </div>
          
          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusOption)}
            className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none"
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
            className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none"
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
            className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none"
          >
            <option value="volume">Sort by Volume</option>
            <option value="close_date">Sort by Close Date</option>
            <option value="created">Sort by Recently Added</option>
          </select>
        </div>
      </div>

      {/* Markets Grid */}
      {loading && markets.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-muted)]">
          Loading markets...
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-muted)]">
          <p className="text-lg mb-2">No markets found</p>
          <p className="text-sm">Try adjusting your filters or sync markets first</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map((market) => (
              <a
                key={market.id}
                href={`/markets/${market.id}`}
                className="glass-card p-5 hover:border-[var(--border-medium)] transition-all group"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`badge ${getStatusColor(market.status)}`}>
                    {market.status}
                  </span>
                  {market.positions_count > 0 && (
                    <span className="text-xs text-[var(--accent-blue)]">
                      {market.positions_count} agent{market.positions_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                {/* Question */}
                <h3 className="font-medium mb-3 line-clamp-2 group-hover:text-gradient transition-all">
                  {market.question}
                </h3>
                
                {/* Price bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--accent-emerald)]">YES {formatPrice(market.current_price)}</span>
                    <span className="text-[var(--accent-rose)]">NO {formatPrice(market.current_price ? 1 - market.current_price : null)}</span>
                  </div>
                  <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--accent-emerald)] to-[var(--accent-blue)]"
                      style={{ width: `${(market.current_price || 0.5) * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                  <span>{market.category || 'General'}</span>
                  <span>{formatVolume(market.volume)}</span>
                  <span>Closes {formatCloseDate(market.close_date)}</span>
                </div>
              </a>
            ))}
          </div>
          
          {/* Load more */}
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={() => fetchMarkets(false)}
                disabled={loading}
                className="btn btn-secondary"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
          
          <div className="mt-4 text-center text-sm text-[var(--text-muted)]">
            Showing {markets.length} of {total} markets
          </div>
        </>
      )}
    </div>
  );
}

