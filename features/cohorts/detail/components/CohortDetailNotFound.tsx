import Link from 'next/link';
import { PageContainer } from '@/components/ui/PageContainer';

interface CohortDetailNotFoundProps {
  title: string;
}

export function CohortDetailNotFound({ title }: CohortDetailNotFoundProps) {
  return (
    <PageContainer className="py-20 text-center">
      <h1 className="heading-block mb-4">{title}</h1>
      <p className="text-[var(--text-secondary)] mb-6">
        The cohort may no longer be active, or the link may be pointing to a missing record.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/cohorts" className="btn btn-primary">
          Back to Cohorts
        </Link>
        <Link href="/models" className="btn btn-secondary">
          View Model Families
        </Link>
      </div>
    </PageContainer>
  );
}
