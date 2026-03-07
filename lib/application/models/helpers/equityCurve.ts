import type { ModelDetailPayload } from '@/lib/application/models/types';

export function buildEquityCurve(
  snapshots: Array<{ snapshot_timestamp: string; total_value: number }>
): ModelDetailPayload['equity_curve'] {
  const snapshotsByTime = new Map<string, number[]>();

  for (const snapshot of snapshots) {
    if (!snapshotsByTime.has(snapshot.snapshot_timestamp)) {
      snapshotsByTime.set(snapshot.snapshot_timestamp, []);
    }

    snapshotsByTime.get(snapshot.snapshot_timestamp)!.push(snapshot.total_value);
  }

  return Array.from(snapshotsByTime.entries()).map(([timestamp, values]) => ({
    snapshot_timestamp: timestamp,
    total_value: values.reduce((sum, value) => sum + value, 0) / values.length
  }));
}
