import Link from 'next/link';
import { formatDecimal, formatRatePercent, formatSignedUsd } from '@/lib/format/display';
import type { LeaderboardEntry } from '@/features/home/types';

interface LeaderboardPreviewProps {
  data: LeaderboardEntry[];
  hasRealData: boolean;
}

export function LeaderboardPreview({ data, hasRealData }: LeaderboardPreviewProps) {
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <section className="container-wide mx-auto px-6 py-8 md:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <p className="text-[var(--accent-gold)] font-mono text-sm tracking-wider mb-2">LEADERBOARD</p>
          <h2 className="text-2xl md:text-3xl">Current Standings</h2>
        </div>
        <Link href="/models" className="btn btn-ghost group">
          View All
          <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {top3.map((entry, index) => (
          <Link
            href={`/models/${entry.family_slug}`}
            key={entry.family_slug}
            className="card-featured p-6 group cursor-pointer animate-fade-in"
            style={{ animationDelay: `${(index + 1) * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{
                    backgroundColor: `${entry.color}20`,
                    color: entry.color
                  }}
                >
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{entry.display_name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{entry.provider}</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-[var(--text-muted)] transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Total P/L</p>
                <p className={`text-2xl font-bold ${!hasRealData ? 'text-[var(--text-muted)]' : entry.total_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {hasRealData ? formatSignedUsd(entry.total_pnl) : 'N/A'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-subtle)]">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Brier Score</p>
                  <p className="font-mono text-sm">{formatDecimal(entry.avg_brier_score, { decimals: 3 })}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Win Rate</p>
                  <p className="font-mono text-sm">{formatRatePercent(entry.win_rate, { decimals: 0 })}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card p-4">
        <div className="divide-y divide-[var(--border-subtle)]">
          {rest.map((entry, index) => (
            <Link
              href={`/models/${entry.family_slug}`}
              key={entry.family_slug}
              className="flex items-center justify-between py-4 first:pt-0 last:pb-0 group"
            >
              <div className="flex items-center gap-4">
                <span className="w-8 text-center font-mono text-[var(--text-muted)]">{index + 4}</span>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <div>
                  <p className="font-medium group-hover:text-[var(--accent-gold)] transition-colors">{entry.display_name}</p>
                  <p className="text-sm text-[var(--text-muted)]">{entry.provider}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono ${!hasRealData ? 'text-[var(--text-muted)]' : entry.total_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {hasRealData ? formatSignedUsd(entry.total_pnl) : 'N/A'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
