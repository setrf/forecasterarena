import Link from 'next/link';
import { formatDisplayDate } from '@/lib/utils';
import type { CohortSummary } from '@/features/cohorts/list/types';

interface CohortCardsSectionProps {
  title: string;
  cohorts: CohortSummary[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  variant: 'active' | 'completed';
}

export function CohortCardsSection({
  title,
  cohorts,
  loading,
  emptyTitle,
  emptyDescription,
  variant
}: CohortCardsSectionProps) {
  const isActive = variant === 'active';

  return (
    <div className="mb-16">
      {isActive ? (
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-[var(--color-positive)] animate-pulse" />
          <h2 className="heading-block">{title}</h2>
        </div>
      ) : (
        <h2 className="heading-block mb-6">{title}</h2>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 card">
          <div className="w-6 h-6 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cohorts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={isActive
                ? 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                : 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4'
              } />
            </svg>
          </div>
          <p className="text-xl font-medium mb-2">{emptyTitle}</p>
          <p className="text-[var(--text-muted)]">
            {emptyDescription}
          </p>
        </div>
      ) : isActive ? (
        <div className="grid md:grid-cols-2 gap-6">
          {cohorts.map((cohort) => (
            <Link
              key={cohort.id}
              href={`/cohorts/${cohort.id}`}
              className="card-featured p-8 group"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="badge badge-active mb-3">Live</span>
                  <h3 className="heading-block group-hover:text-[var(--accent-gold)] transition-colors">
                    Cohort #{cohort.cohort_number}
                  </h3>
                </div>
                <svg className="w-5 h-5 text-[var(--text-muted)] transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Started</p>
                  <p className="font-semibold">{formatDisplayDate(cohort.started_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Models</p>
                  <p className="font-semibold">{cohort.num_agents}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Markets</p>
                  <p className="font-semibold">{cohort.total_markets_traded}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cohorts.map((cohort) => (
            <Link
              key={cohort.id}
              href={`/cohorts/${cohort.id}`}
              className="card p-6 group"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="heading-card group-hover:text-[var(--accent-gold)] transition-colors">
                  Cohort #{cohort.cohort_number}
                </h3>
                <span className="badge badge-completed">Completed</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text-muted)]">Started</p>
                  <p>{formatDisplayDate(cohort.started_at)}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Markets</p>
                  <p>{cohort.total_markets_traded}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
