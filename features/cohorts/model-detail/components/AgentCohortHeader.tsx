import type { AgentCohortData } from '@/features/cohorts/model-detail/types';
import {
  getCohortDecisionStatusBadge,
  getCohortDecisionStatusLabel,
  getCohortScoringStatusBadge,
  getCohortScoringStatusLabel
} from '@/features/cohorts/decisionStatus';

interface AgentCohortHeaderProps {
  data: AgentCohortData;
}

export function AgentCohortHeader({ data }: AgentCohortHeaderProps) {
  return (
    <div className="detail-header">
      <div className="detail-header__identity">
        <div
          className="detail-header__avatar"
          style={{ backgroundColor: data.model.color }}
        >
          {data.model.display_name.substring(0, 2).toUpperCase()}
        </div>

        <div className="flex-1">
          <p className="detail-header__eyebrow">Cohort Model</p>
          <div className="detail-header__badges">
            <h1 className="detail-header__title">{data.model.display_name}</h1>
            {data.model.release_name && data.model.release_name !== data.model.display_name && (
              <span className="badge">{data.model.release_name}</span>
            )}
            <span className={`badge ${data.agent.status === 'active' ? 'badge-active' : 'badge-pending'}`}>
              {data.agent.status}
            </span>
            <span className={`badge ${getCohortDecisionStatusBadge(data.cohort.decision_status)}`}>
              {getCohortDecisionStatusLabel(data.cohort.decision_status)}
            </span>
            <span className={`badge ${getCohortScoringStatusBadge(data.cohort.scoring_status)}`}>
              {getCohortScoringStatusLabel(data.cohort.scoring_status)}
            </span>
            <span className="badge">Week {data.cohort.current_week}</span>
          </div>
          <p className="detail-header__meta">
            {data.model.provider} • in Cohort #{data.cohort.cohort_number}
            {data.cohort.is_archived ? ' • historical archive' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
