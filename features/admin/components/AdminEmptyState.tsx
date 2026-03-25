import Link from 'next/link';
import type { ReactNode } from 'react';

interface AdminEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
}

export function AdminEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon
}: AdminEmptyStateProps) {
  return (
    <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-medium)] bg-[var(--bg-secondary)]/55 px-6 py-10 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)] text-[var(--accent-gold)]">
          {icon}
        </div>
      )}
      <h3 className="heading-card">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn btn-secondary btn-sm mt-5">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
