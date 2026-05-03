import Link from 'next/link';
import { PageContainer } from '@/components/ui/PageContainer';

interface ModelDetailNotFoundProps {
  message: string;
}

export function ModelDetailNotFound({ message }: ModelDetailNotFoundProps) {
  return (
    <PageContainer className="py-20 text-center">
      <h1 className="heading-block mb-4">{message}</h1>
      <p className="text-[var(--text-secondary)] mb-6">
        The model you&apos;re looking for doesn&apos;t exist.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/models" className="btn btn-primary">
          View All Models
        </Link>
        <Link href="/methodology" className="btn btn-secondary">
          Read Methodology
        </Link>
      </div>
    </PageContainer>
  );
}
