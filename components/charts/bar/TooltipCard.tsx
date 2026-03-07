import type { ReactNode } from 'react';

interface TooltipCardProps {
  color: string;
  title: string;
  children: ReactNode;
}

interface TooltipRowProps {
  label: string;
  value: ReactNode;
}

export function TooltipCard({ color, title, children }: TooltipCardProps) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 shadow-xl">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-medium">{title}</span>
      </div>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  );
}

export function TooltipRow({ label, value }: TooltipRowProps) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span>{value}</span>
    </div>
  );
}
