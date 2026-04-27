export interface EquityCurvePoint {
  date: string;
  value: number;
}

export function performanceDataToEquityCurves(
  dataPoints: Array<Record<string, number | string>>
): Record<string, EquityCurvePoint[]> {
  const curves: Record<string, EquityCurvePoint[]> = {};

  for (const point of dataPoints) {
    const date = String(point.date);
    Object.entries(point).forEach(([seriesKey, value]) => {
      if (seriesKey === 'date' || typeof value !== 'number') {
        return;
      }

      if (!curves[seriesKey]) {
        curves[seriesKey] = [];
      }

      curves[seriesKey].push({ date, value });
    });
  }

  return curves;
}

export function performanceDataToEquityCurve(
  dataPoints: Array<Record<string, number | string>>,
  seriesKey: string
): EquityCurvePoint[] {
  return dataPoints
    .map((point) => ({
      date: String(point.date),
      value: point[seriesKey]
    }))
    .filter((point): point is EquityCurvePoint => typeof point.value === 'number');
}
