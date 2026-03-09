import Link from 'next/link';

interface AgentCohortDetailNotFoundProps {
  error: string;
}

export function AgentCohortDetailNotFound({ error }: AgentCohortDetailNotFoundProps) {
  return (
    <div className="container-wide mx-auto px-6 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">{error || 'Not Found'}</h1>
      <p className="text-[var(--text-secondary)] mb-6">
        {error === 'Agent not found in this cohort'
          ? 'This model was not active in this cohort.'
          : 'The page you are looking for does not exist.'}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/cohorts" className="btn btn-primary">
          Back to Cohorts
        </Link>
        <Link href="/models" className="btn btn-secondary">
          Browse Model Families
        </Link>
      </div>
    </div>
  );
}
