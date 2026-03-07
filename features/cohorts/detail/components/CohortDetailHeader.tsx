import Link from 'next/link';
import type { Cohort } from '@/features/cohorts/detail/types';

interface CohortDetailHeaderProps {
  cohort: Cohort;
}

export function CohortDetailHeader({ cohort }: CohortDetailHeaderProps) {
  return (
    <>
      <Link href="/cohorts" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to cohorts
      </Link>

      <div className="flex flex-wrap items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Cohort #{cohort.cohort_number}</h1>
        <span className={`badge ${cohort.status === 'active' ? 'badge-active' : 'badge-completed'}`}>
          {cohort.status}
        </span>
        <span className="text-[var(--text-muted)]">
          {cohort.methodology_version}
        </span>
      </div>
    </>
  );
}
