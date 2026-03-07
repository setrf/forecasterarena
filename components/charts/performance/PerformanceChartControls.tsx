interface PerformanceChartControlsProps {
  isolatedModel: string | null;
  isolatedModelName: string | null;
  showPercent: boolean;
  toggleShowPercent: () => void;
}

export function PerformanceChartControls({
  isolatedModel,
  isolatedModelName,
  showPercent,
  toggleShowPercent
}: PerformanceChartControlsProps) {
  return (
    <>
      <div className="absolute right-0 top-0 z-10">
        <button
          onClick={toggleShowPercent}
          className={`
            rounded-lg px-3 py-1.5 text-xs font-mono transition-all
            ${showPercent
              ? 'border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]'
              : 'border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }
          `}
        >
          {showPercent ? '% Return' : '$ Value'}
        </button>
      </div>

      {isolatedModel && isolatedModelName && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--bg-tertiary)] px-3 py-1 text-xs text-[var(--text-muted)]">
          Showing only {isolatedModelName} • Click again to show all
        </div>
      )}
    </>
  );
}
