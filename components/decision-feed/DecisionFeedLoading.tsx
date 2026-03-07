interface DecisionFeedLoadingProps {
  className: string;
}

export function DecisionFeedLoading({ className }: DecisionFeedLoadingProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="p-4 bg-[var(--bg-tertiary)] rounded-lg animate-pulse">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-[var(--border-medium)]" />
            <div className="h-4 w-24 bg-[var(--border-medium)] rounded" />
          </div>
          <div className="h-3 w-full bg-[var(--border-medium)] rounded" />
        </div>
      ))}
    </div>
  );
}
