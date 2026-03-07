import Link from 'next/link';

interface AgentCohortBreadcrumbsProps {
  cohortId: string;
  cohortNumber: number;
  modelName: string;
}

export function AgentCohortBreadcrumbs({
  cohortId,
  cohortNumber,
  modelName
}: AgentCohortBreadcrumbsProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-6">
      <Link href="/cohorts" className="hover:text-[var(--text-primary)] transition-colors">
        Cohorts
      </Link>
      <span>›</span>
      <Link href={`/cohorts/${cohortId}`} className="hover:text-[var(--text-primary)] transition-colors">
        Cohort #{cohortNumber}
      </Link>
      <span>›</span>
      <span className="text-[var(--text-primary)]">{modelName}</span>
    </div>
  );
}
