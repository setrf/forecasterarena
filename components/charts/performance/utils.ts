import { parseUTCTimestamp } from '@/lib/utils';
import { BASELINE } from '@/components/charts/performance/constants';
import type {
  ModelConfig,
  PerformanceDataPoint,
  ReleaseChangeEvent
} from '@/components/charts/performance/types';

export function getPerformanceSummary(
  filteredData: PerformanceDataPoint[],
  models: ModelConfig[]
): {
  leaderId: string | null;
  latestValues: Record<string, number>;
  previousValues: Record<string, number>;
} {
  if (filteredData.length === 0) {
    return { leaderId: null, latestValues: {}, previousValues: {} };
  }

  const latest = filteredData[filteredData.length - 1];
  const previous = filteredData.length > 1 ? filteredData[filteredData.length - 2] : latest;

  let leaderId: string | null = null;
  let maxValue = -Infinity;
  const latestValues: Record<string, number> = {};
  const previousValues: Record<string, number> = {};

  models.forEach((model) => {
    const latestValue = latest[model.id];
    const previousValue = previous[model.id];

    if (typeof latestValue === 'number') {
      latestValues[model.id] = latestValue;
      if (latestValue > maxValue) {
        maxValue = latestValue;
        leaderId = model.id;
      }
    }

    if (typeof previousValue === 'number') {
      previousValues[model.id] = previousValue;
    }
  });

  return {
    leaderId,
    latestValues,
    previousValues
  };
}

export function calculatePerformanceYDomain(
  filteredData: PerformanceDataPoint[],
  models: ModelConfig[]
): [number, number] {
  if (filteredData.length === 0) {
    return [9000, 11000];
  }

  let min = Infinity;
  let max = -Infinity;

  filteredData.forEach((point) => {
    models.forEach((model) => {
      const value = point[model.id];
      if (typeof value === 'number') {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });
  });

  min = Math.min(min, BASELINE);
  max = Math.max(max, BASELINE);

  const padding = (max - min) * 0.1;

  return [
    Math.floor((min - padding) / 500) * 500,
    Math.ceil((max + padding) / 500) * 500
  ];
}

export function getSundayMarkers(filteredData: PerformanceDataPoint[]): string[] {
  if (filteredData.length === 0) {
    return [];
  }

  const markers: string[] = [];
  let lastSunday: string | null = null;

  filteredData.forEach((point) => {
    const date = parseUTCTimestamp(point.date);
    if (date.getUTCDay() !== 0) {
      return;
    }

    const dateKey = date.toISOString().split('T')[0];
    if (dateKey === lastSunday) {
      return;
    }

    markers.push(point.date);
    lastSunday = dateKey;
  });

  return markers;
}

export function filterReleaseChanges(
  releaseChanges: ReleaseChangeEvent[] | undefined,
  data: PerformanceDataPoint[]
): ReleaseChangeEvent[] {
  const changes = releaseChanges ?? [];

  if (changes.length === 0 || data.length === 0) {
    return [];
  }

  const firstPointDate = parseUTCTimestamp(data[0].date);
  const lastPointDate = parseUTCTimestamp(data[data.length - 1].date);

  return changes.filter((event) => {
    const eventDate = parseUTCTimestamp(event.date);
    return eventDate >= firstPointDate && eventDate <= lastPointDate;
  });
}
