'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AppShellBoundaryProps {
  children: ReactNode;
}

export function AppShellBoundary({ children }: AppShellBoundaryProps) {
  const pathname = usePathname();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}
