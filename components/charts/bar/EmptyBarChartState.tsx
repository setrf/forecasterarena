interface EmptyBarChartStateProps {
  height: number;
  message: string;
}

export function EmptyBarChartState({ height, message }: EmptyBarChartStateProps) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)]"
      style={{ height }}
    >
      <p>{message}</p>
    </div>
  );
}
