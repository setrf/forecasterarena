import Link from 'next/link';
import { PageContainer } from '@/components/ui/PageContainer';

interface AgentCohortDetailNotFoundProps {
  error: string;
}

export function AgentCohortDetailNotFound({ error }: AgentCohortDetailNotFoundProps) {
  return (
    <PageContainer className="py-20 text-center">
      <h1 className="heading-block mb-4">{error || 'Not Found'}</h1>
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
    </PageContainer>
  );
}
