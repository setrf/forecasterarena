import Link from 'next/link';

export function AdminNavigationLinks() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <Link href="/admin/benchmark" className="glass-card p-6 hover:border-[var(--border-medium)] transition-colors group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-lg font-bold">
            #
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-gradient">Benchmark Control</h3>
            <p className="text-sm text-[var(--text-muted)]">Manage releases and future cohort lineups</p>
          </div>
        </div>
      </Link>

      <Link href="/admin/logs" className="glass-card p-6 hover:border-[var(--border-medium)] transition-colors group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
            📋
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-gradient">System Logs</h3>
            <p className="text-sm text-[var(--text-muted)]">View recent system events</p>
          </div>
        </div>
      </Link>

      <Link href="/admin/costs" className="glass-card p-6 hover:border-[var(--border-medium)] transition-colors group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-lg font-bold">
            $
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-gradient">API Costs</h3>
            <p className="text-sm text-[var(--text-muted)]">Track OpenRouter spending</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
