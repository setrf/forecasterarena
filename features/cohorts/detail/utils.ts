import { MODELS } from '@/lib/constants';
import type { AgentStats } from '@/features/cohorts/detail/types';

export function createCohortChartData(
  equityCurves: Record<string, Array<{ date: string; value: number }>>
): Array<{ date: string; [modelId: string]: string | number }> {
  if (Object.keys(equityCurves).length === 0) {
    return [];
  }

  const allDates = new Set<string>();
  Object.values(equityCurves).forEach((curve) => {
    curve.forEach((point) => {
      allDates.add(point.date);
    });
  });

  return Array.from(allDates).sort().map((date) => {
    const point: { date: string; [modelId: string]: string | number } = { date };
    Object.entries(equityCurves).forEach(([modelId, curve]) => {
      const dataPoint = curve.find((entry) => entry.date === date);
      point[modelId] = dataPoint?.value ?? 10000;
    });
    return point;
  });
}

export function getCohortChartModels() {
  return MODELS.map((model) => ({
    id: model.id,
    name: model.displayName,
    color: model.color
  }));
}

export function sortAgentsByValue(agents: AgentStats[]): AgentStats[] {
  return [...agents].sort((left, right) => right.total_value - left.total_value);
}
