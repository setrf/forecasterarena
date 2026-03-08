import type { AgentStats } from '@/features/cohorts/detail/types';

export function createCohortChartData(
  equityCurves: Record<string, Array<{ date: string; value: number }>>
): Array<{ date: string; [seriesKey: string]: string | number }> {
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
    const point: { date: string; [seriesKey: string]: string | number } = { date };
    Object.entries(equityCurves).forEach(([seriesKey, curve]) => {
      const dataPoint = curve.find((entry) => entry.date === date);
      point[seriesKey] = dataPoint?.value ?? 10000;
    });
    return point;
  });
}

export function getCohortChartModels(agents: AgentStats[]) {
  return agents.map((agent) => ({
    id: agent.family_slug,
    name: agent.model_display_name,
    color: agent.model_color ?? '#94A3B8',
    currentReleaseName: agent.model_release_name ?? null
  }));
}

export function sortAgentsByValue(agents: AgentStats[]): AgentStats[] {
  return [...agents].sort((left, right) => right.total_value - left.total_value);
}
