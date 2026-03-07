import Link from 'next/link';

interface MarketDetailNotFoundProps {
  message: string;
}

export function MarketDetailNotFound({ message }: MarketDetailNotFoundProps) {
  return (
    <div className="container-wide mx-auto px-6 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">{message}</h1>
      <Link href="/markets" className="btn btn-primary">
        Back to Markets
      </Link>
    </div>
  );
}
