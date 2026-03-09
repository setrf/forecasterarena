'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { PageIntro } from '@/components/ui/PageIntro';

interface AdminPageShellProps {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

const adminLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/benchmark', label: 'Benchmark' },
  { href: '/admin/costs', label: 'Costs' },
  { href: '/admin/logs', label: 'Logs' },
];

export function AdminPageShell({
  title,
  description,
  actions,
  children
}: AdminPageShellProps) {
  const pathname = usePathname();

  return (
    <div className="container-wide mx-auto px-6 py-12">
      <div className="-mx-6 mb-8">
        <PageIntro
          eyebrow="Admin"
          title={title}
          description={description}
          actions={actions}
        />
      </div>

      <nav
        aria-label="Admin sections"
        className="mb-8 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/75 p-2 backdrop-blur sm:flex sm:flex-wrap sm:items-center"
      >
        {adminLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-colors sm:min-h-0 ${
                active
                  ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
