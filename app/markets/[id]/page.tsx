import { notFound } from 'next/navigation';
import type { MarketDetailLoadResult } from '@/features/markets/detail/api';
import MarketDetailPageClient from '@/features/markets/detail/MarketDetailPageClient';
import { getMarketDetail } from '@/lib/application/markets/getMarketDetail';

type MarketDetailPageData = Extract<MarketDetailLoadResult, { status: 'ok' }>['data'];

export default async function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = getMarketDetail(id);
  if (result.status !== 'ok') notFound();
  return <MarketDetailPageClient marketId={id} initialData={{
    market: result.data.market,
    positions: result.data.positions,
    trades: result.data.trades,
    brierScores: result.data.brier_scores
  } as unknown as MarketDetailPageData} />;
}
