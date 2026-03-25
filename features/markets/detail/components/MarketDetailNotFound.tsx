import Link from 'next/link';

interface MarketDetailNotFoundProps {
  message: string;
}

export function MarketDetailNotFound({ message }: MarketDetailNotFoundProps) {
  return (
    <div className="container-wide mx-auto px-6 py-20 text-center">
      <h1 className="heading-block mb-4">{message}</h1>
      <p className="text-[var(--text-secondary)] mb-6">
        The market may have been removed, filtered out of the synced set, or the link may be incomplete.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/markets" className="btn btn-primary">
          Back to Markets
        </Link>
        <Link href="/cohorts" className="btn btn-secondary">
          Browse Cohorts
        </Link>
      </div>
    </div>
  );
}
