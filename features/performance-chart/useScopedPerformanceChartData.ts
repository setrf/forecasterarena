'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  PerformanceDataPoint,
  ReleaseChangeEvent,
  TimeRange
} from '@/components/charts/performance/types';
import { fetchPerformanceChartSeries } from '@/features/performance-chart/api';

export function useScopedPerformanceChartData(args: {
  timeRange: TimeRange;
  cohortId?: string | null;
  familyId?: string | null;
  enabled?: boolean;
  initialData: PerformanceDataPoint[];
  initialReleaseChanges: ReleaseChangeEvent[];
}) {
  const [data, setData] = useState<PerformanceDataPoint[]>(args.initialData);
  const [releaseChanges, setReleaseChanges] = useState<ReleaseChangeEvent[]>(args.initialReleaseChanges);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setData(args.initialData);
    setReleaseChanges(args.initialReleaseChanges);
  }, [args.initialData, args.initialReleaseChanges]);

  useEffect(() => {
    if (args.enabled === false) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const abortController = new AbortController();

    async function loadSeries() {
      setLoading(true);
      try {
        const result = await fetchPerformanceChartSeries({
          timeRange: args.timeRange,
          cohortId: args.cohortId,
          familyId: args.familyId,
          signal: abortController.signal
        });
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setData(result.data);
        setReleaseChanges(result.releaseChanges);
      } catch {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }
      } finally {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setLoading(false);
      }
    }

    void loadSeries();

    return () => {
      abortController.abort();
    };
  }, [args.cohortId, args.enabled, args.familyId, args.timeRange]);

  return {
    data,
    releaseChanges,
    loading
  };
}
