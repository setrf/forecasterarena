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
    <section className="border-b border-[var(--border-subtle)] bg-[rgba(9,10,18,0.92)]">
      <div className="container-wide mx-auto px-0">
        <div className="grid grid-cols-2 border-x-0 border-[var(--border-subtle)] md:grid-cols-4 md:border-x">
          <div className="min-w-0 border-b border-[var(--border-subtle)] px-5 py-6 sm:px-6 md:border-b-0 md:border-r md:px-8 md:py-8 animate-fade-in">
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

          <div className="min-w-0 border-b border-l border-[var(--border-subtle)] px-5 py-6 sm:px-6 md:border-b-0 md:border-l-0 md:border-r md:px-8 md:py-8 animate-fade-in delay-100">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Models</p>
            <p className="text-3xl md:text-4xl font-bold">7</p>
            <p className="text-sm text-[var(--text-secondary)]">Frontier LLMs</p>
          </div>

          <div className="min-w-0 px-5 py-6 sm:px-6 md:border-r md:border-[var(--border-subtle)] md:px-8 md:py-8 animate-fade-in delay-200">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Capital</p>
            <p className="text-3xl md:text-4xl font-bold">$70K</p>
            <p className="text-sm text-[var(--text-secondary)]">$10K per model</p>
          </div>

          <div className="min-w-0 border-l border-[var(--border-subtle)] px-5 py-6 sm:px-6 md:border-l-0 md:px-8 md:py-8 animate-fade-in delay-300">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Markets</p>
            <p className="text-3xl md:text-4xl font-bold">{formattedMarketCount}</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {marketCount && marketCount > 0 ? 'Via Polymarket' : 'Awaiting market sync'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
