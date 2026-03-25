import { notFound } from 'next/navigation';
import DecisionDetailPageClient from '@/features/decisions/detail/DecisionDetailPageClient';
import type { DecisionDetailData } from '@/features/decisions/detail/types';
import { getDecisionDetail } from '@/lib/application/decisions';

export default async function DecisionPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = getDecisionDetail(id);

  if (result.status !== 'ok') {
    notFound();
  }

  return (
    <DecisionDetailPageClient
      decisionId={id}
      initialData={result.data as unknown as DecisionDetailData}
    />
  );
}
