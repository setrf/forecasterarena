import Link from 'next/link';
import type { Cohort } from '@/features/cohorts/detail/types';
import {
  getCohortDecisionStatusBadge,
  getCohortDecisionStatusLabel,
  getCohortScoringStatusBadge,
  getCohortScoringStatusLabel
} from '@/features/cohorts/decisionStatus';

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
            <span className={`badge ${getCohortDecisionStatusBadge(cohort.decision_status)}`}>
              {getCohortDecisionStatusLabel(cohort.decision_status)}
            </span>
            <span className={`badge ${getCohortScoringStatusBadge(cohort.scoring_status)}`}>
              {getCohortScoringStatusLabel(cohort.scoring_status)}
            </span>
          </div>
          <p className="detail-header__meta">
            {cohort.methodology_version}
            {cohort.is_archived ? ' · Historical archive, excluded from current v2 scoring' : ''}
          </p>
        </div>

        <div className="metric-tile">
          <p className="metric-tile__label">Methodology</p>
          <p className="metric-tile__value text-xl">{cohort.methodology_version}</p>
          {cohort.is_archived && (
            <p className="metric-tile__meta">Historical archive</p>
          )}
        </div>
      </div>
    </>
  );
}
