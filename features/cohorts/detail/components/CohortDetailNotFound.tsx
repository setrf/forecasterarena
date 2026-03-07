import Link from 'next/link';

interface CohortDetailNotFoundProps {
  title: string;
}

export function CohortDetailNotFound({ title }: CohortDetailNotFoundProps) {
  return (
    <div className="container-wide mx-auto px-6 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <Link href="/cohorts" className="btn btn-primary">
        Back to Cohorts
      </Link>
    </div>
  );
}
