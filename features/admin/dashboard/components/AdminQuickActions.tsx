interface AdminQuickActionsProps {
  actionLoading: string | null;
  onExecuteAction: (action: string) => void;
}

const ACTIONS = [
  {
    action: 'start-cohort',
    title: 'Start New Cohort',
    idleLabel: 'Force start a new cohort',
    loadingLabel: 'Starting...',
    borderClass: 'hover:border-[var(--accent-blue)]',
    iconClass: 'group-hover:text-[var(--accent-blue)]',
    iconPath: 'M12 4v16m8-8H4'
  },
  {
    action: 'sync-markets',
    title: 'Sync Markets',
    idleLabel: 'Fetch latest from Polymarket',
    loadingLabel: 'Syncing...',
    borderClass: 'hover:border-[var(--accent-emerald)]',
    iconClass: 'group-hover:text-[var(--accent-emerald)]',
    iconPath: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
  },
  {
    action: 'backup',
    title: 'Create Backup',
    idleLabel: 'Backup database now',
    loadingLabel: 'Creating...',
    borderClass: 'hover:border-[var(--accent-violet)]',
    iconClass: 'group-hover:text-[var(--accent-violet)]',
    iconPath: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4'
  }
] as const;

export function AdminQuickActions({
  actionLoading,
  onExecuteAction
}: AdminQuickActionsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
      {ACTIONS.map((item) => (
        <button
          key={item.action}
          onClick={() => onExecuteAction(item.action)}
          disabled={actionLoading !== null}
          className={`stat-card text-left transition-colors group disabled:opacity-50 ${item.borderClass}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {actionLoading === item.action ? item.loadingLabel : item.idleLabel}
              </p>
            </div>
            <svg className={`w-5 h-5 text-[var(--text-muted)] ${item.iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconPath} />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}
