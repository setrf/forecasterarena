import Link from 'next/link';
import type { Cohort } from '@/features/cohorts/detail/types';

interface CohortDetailHeaderProps {
  cohort: Cohort;
}

export function CohortDetailHeader({ cohort }: CohortDetailHeaderProps) {
  return (
    <>
      <Link href="/cohorts" className="detail-backlink">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to cohorts
      </Link>

      <div className="detail-header">
        <div>
          <p className="detail-header__eyebrow">Cohort</p>
          <div className="detail-header__badges">
            <h1 className="detail-header__title">Cohort #{cohort.cohort_number}</h1>
            <span className={`badge ${cohort.status === 'active' ? 'badge-active' : 'badge-completed'}`}>
              {cohort.status}
            </span>
          </div>
          <p className="detail-header__meta">{cohort.methodology_version}</p>
        </div>

        <div className="metric-tile">
          <p className="metric-tile__label">Methodology</p>
          <p className="metric-tile__value text-xl">{cohort.methodology_version}</p>
        </div>
      </div>
    </>
  );
}
