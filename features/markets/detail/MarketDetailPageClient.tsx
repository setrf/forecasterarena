'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MarketBrierScoresTable } from '@/features/markets/detail/components/MarketBrierScoresTable';
import { MarketDetailHeader } from '@/features/markets/detail/components/MarketDetailHeader';
import { MarketDetailNotFound } from '@/features/markets/detail/components/MarketDetailNotFound';
import { MarketExternalLink } from '@/features/markets/detail/components/MarketExternalLink';
import { MarketPositionsTable } from '@/features/markets/detail/components/MarketPositionsTable';
import { MarketPriceCard } from '@/features/markets/detail/components/MarketPriceCard';
import { MarketStatsGrid } from '@/features/markets/detail/components/MarketStatsGrid';
import { MarketTradesTable } from '@/features/markets/detail/components/MarketTradesTable';
import type {
  MarketBrierScore,
  MarketDetail,
  MarketPosition,
  MarketTrade
} from '@/features/markets/detail/types';
import { getMarketStatusBadge } from '@/features/markets/detail/utils';

export default function MarketDetailPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [positions, setPositions] = useState<MarketPosition[]>([]);
  const [trades, setTrades] = useState<MarketTrade[]>([]);
  const [brierScores, setBrierScores] = useState<MarketBrierScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/markets/${id}`);
        if (!res.ok) {
          setError(res.status === 404 ? 'Market not found' : 'Failed to load market');
          return;
        }

        const data = await res.json() as {
          market: MarketDetail;
          positions?: MarketPosition[];
          trades?: MarketTrade[];
          brier_scores?: MarketBrierScore[];
        };

        setMarket(data.market);
        setPositions(data.positions || []);
        setTrades(data.trades || []);
        setBrierScores(data.brier_scores || []);
      } catch {
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
    return <MarketDetailNotFound message={error || 'Market Not Found'} />;
  }

  return (
    <div className="container-wide mx-auto px-6 py-12">
      <MarketDetailHeader
        market={market}
        statusBadge={getMarketStatusBadge(market.status)}
      />
      <MarketPriceCard market={market} />
      <MarketStatsGrid market={market} positionsCount={positions.length} />
      <MarketPositionsTable
        positions={positions}
        onNavigateToDecision={(decisionId) => router.push(`/decisions/${decisionId}`)}
      />
      {market.status === 'resolved' && (
        <MarketBrierScoresTable scores={brierScores} />
      )}
      <MarketTradesTable
        trades={trades}
        onNavigateToDecision={(decisionId) => router.push(`/decisions/${decisionId}`)}
      />
      <MarketExternalLink market={market} />
    </div>
  );
}
