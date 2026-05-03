import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={['container-wide mx-auto px-6 py-12', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export function PageLoadingState({ children }: { children: ReactNode }) {
  return (
    <div className="container-wide mx-auto px-6 py-20 text-center text-[var(--text-muted)]">
      {children}
    </div>
  );
}
