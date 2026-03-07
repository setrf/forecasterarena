'use client';

import { useParams, useRouter } from 'next/navigation';
import { MarketBrierScoresTable } from '@/features/markets/detail/components/MarketBrierScoresTable';
import { MarketDetailHeader } from '@/features/markets/detail/components/MarketDetailHeader';
import { MarketDetailNotFound } from '@/features/markets/detail/components/MarketDetailNotFound';
import { MarketExternalLink } from '@/features/markets/detail/components/MarketExternalLink';
import { MarketPositionsTable } from '@/features/markets/detail/components/MarketPositionsTable';
import { MarketPriceCard } from '@/features/markets/detail/components/MarketPriceCard';
import { MarketStatsGrid } from '@/features/markets/detail/components/MarketStatsGrid';
import { MarketTradesTable } from '@/features/markets/detail/components/MarketTradesTable';
import { useMarketDetailData } from '@/features/markets/detail/useMarketDetailData';
import { getMarketStatusBadge } from '@/features/markets/detail/utils';

export default function MarketDetailPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { market, positions, trades, brierScores, loading, error } = useMarketDetailData(id);

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
