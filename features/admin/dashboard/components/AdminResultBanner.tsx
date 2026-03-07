import type { ResultMessage } from '@/features/admin/dashboard/types';

interface AdminResultBannerProps {
  result: ResultMessage | null;
}

export function AdminResultBanner({ result }: AdminResultBannerProps) {
  if (!result) {
    return null;
  }

  return (
    <div className={`mb-6 p-4 rounded-lg ${result.type === 'success'
      ? 'bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[var(--accent-emerald)]'
      : 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[var(--accent-rose)]'
    }`}>
      {result.message}
    </div>
  );
}
