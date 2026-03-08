import type { ModelDetailData } from '@/features/models/detail/types';

export function createModelChartData(seriesKey: string, data: ModelDetailData | null) {
  if (!data?.equity_curve?.length) {
    return [];
  }

  return data.equity_curve.map((point) => ({
    date: point.snapshot_timestamp,
    [seriesKey]: point.total_value
  }));
}
