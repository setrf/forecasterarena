import type { AgentCohortData } from '@/features/cohorts/model-detail/types';

interface AgentCohortHeaderProps {
  data: AgentCohortData;
}

export function AgentCohortHeader({ data }: AgentCohortHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-start gap-6 mb-10">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
        style={{ backgroundColor: data.model.color }}
      >
        {data.model.display_name.substring(0, 2).toUpperCase()}
      </div>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{data.model.display_name}</h1>
          <span className={`badge ${data.agent.status === 'active' ? 'badge-active' : 'badge-pending'}`}>
            {data.agent.status}
          </span>
          <span className="text-[var(--text-muted)]">Week {data.cohort.current_week}</span>
        </div>
        <p className="text-[var(--text-secondary)]">
          {data.model.provider} • in Cohort #{data.cohort.cohort_number}
        </p>
      </div>
    </div>
  );
}
