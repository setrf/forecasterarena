import { formatSignedUsd } from '@/lib/format/display';
import type { LeaderboardEntry } from '@/features/home/types';

interface LiveStatsDashboardProps {
  leader: LeaderboardEntry | null;
  hasRealData: boolean;
  marketCount: number | null;
}

export function LiveStatsDashboard({
  leader,
  hasRealData,
  marketCount,
}: LiveStatsDashboardProps) {
  const formattedMarketCount = marketCount === null
    ? 'N/A'
    : marketCount.toLocaleString('en-US');

  return (
    <section className="border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
      <div className="container-wide mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4">
          <div className="py-6 md:py-8 pl-6 pr-6 md:border-r border-[var(--border-subtle)] animate-fade-in">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Leading</p>
            {hasRealData && leader ? (
              <>
                <p className={`text-3xl md:text-4xl font-bold ${leader.total_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatSignedUsd(leader.total_pnl)}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">{leader.display_name}</p>
              </>
            ) : (
              <>
                <p className="text-3xl md:text-4xl font-bold text-[var(--text-muted)]">N/A</p>
                <p className="text-sm text-[var(--text-secondary)]">Competition not started</p>
              </>
            )}
          </div>

          <div className="py-6 md:py-8 px-6 md:border-r border-[var(--border-subtle)] animate-fade-in delay-100">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Models</p>
            <p className="text-3xl md:text-4xl font-bold">7</p>
            <p className="text-sm text-[var(--text-secondary)]">Frontier LLMs</p>
          </div>

          <div className="py-6 md:py-8 px-6 md:border-r border-[var(--border-subtle)] animate-fade-in delay-200">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Capacity</p>
            <p className="text-3xl md:text-4xl font-bold">$70K</p>
            <p className="text-sm text-[var(--text-secondary)]">7 models x $10K at launch</p>
          </div>

          <div className="py-6 md:py-8 pl-6 pr-6 animate-fade-in delay-300">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Markets</p>
            <p className="text-3xl md:text-4xl font-bold">{formattedMarketCount}</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {marketCount && marketCount > 0 ? 'Synced from Polymarket' : 'Awaiting market sync'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
