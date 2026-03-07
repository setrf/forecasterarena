import Link from 'next/link';

interface ModelDetailNotFoundProps {
  message: string;
}

export function ModelDetailNotFound({ message }: ModelDetailNotFoundProps) {
  return (
    <div className="container-wide mx-auto px-6 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">{message}</h1>
      <p className="text-[var(--text-secondary)] mb-6">
        The model you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/models" className="btn btn-primary">
        View All Models
      </Link>
    </div>
  );
}
