'use client';

import { AdminEmptyState } from '@/features/admin/components/AdminEmptyState';
import { AdminPageShell } from '@/features/admin/components/AdminPageShell';
import { formatRelativeTime } from '@/lib/utils';
import { useAdminLogsController } from '@/features/admin/logs/useAdminLogsController';
import { formatEventData, getSeverityStyle } from '@/features/admin/logs/utils';

export default function AdminLogsPageClient() {
  const {
    logs,
    loading,
    error,
    severity,
    autoRefresh,
    expandedId,
    errorCount,
    warningCount,
    setSeverity,
    setAutoRefresh,
    fetchLogs,
    toggleExpanded
  } = useAdminLogsController();
  const locked = Boolean(error && error.toLowerCase().includes('authentication required'));

  if (locked) {
    return (
      <AdminPageShell
        title="System Logs"
        description="Monitor operational events, warnings, and error trails."
      >
        <AdminEmptyState
          title="Admin authentication required"
          description="Log in through the admin dashboard before opening the live log stream. Once authenticated, this page will refresh into the latest warnings, errors, and job traces."
          actionLabel="Open Admin Dashboard"
          actionHref="/admin"
        />
      </AdminPageShell>
    );
  }

  if (error) {
    return (
      <AdminPageShell
        title="System Logs"
        description="Monitor operational events, warnings, and error trails."
      >
        <AdminEmptyState
          title="Unable to load logs"
          description={error}
          actionLabel="Return to Admin"
          actionHref="/admin"
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="System Logs"
      description="Monitor operational events, warnings, and error trails."
      actions={(
        <>
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              className="rounded border-[var(--border-medium)]"
            />
            Auto-refresh
          </label>
          <button onClick={fetchLogs} className="btn btn-secondary text-sm">
            Refresh
          </button>
        </>
      )}
    >
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="stat-card">
          <div className="stat-value">{logs.length}</div>
          <div className="stat-label">Total Logs</div>
        </div>
        <div className="stat-card border-[var(--accent-amber)]/30">
          <div className="stat-value text-[var(--accent-amber)]">{warningCount}</div>
          <div className="stat-label">Warnings</div>
        </div>
        <div className="stat-card border-[var(--accent-rose)]/30">
          <div className="stat-value text-[var(--accent-rose)]">{errorCount}</div>
          <div className="stat-label">Errors</div>
        </div>
      </div>

      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {(['all', 'info', 'warning', 'error'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setSeverity(value)}
              className={`btn text-sm ${severity === value ? 'btn-primary' : 'btn-secondary'}`}
            >
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card divide-y divide-[var(--border-subtle)]">
        {loading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <AdminEmptyState
            title="No logs found"
            description="When jobs run or warnings fire, they’ll appear here. You can leave auto-refresh on during debugging to watch new events arrive."
          />
        ) : (
          logs.map((log) => {
            const style = getSeverityStyle(log.severity);
            const isExpanded = expandedId === log.id;
            const eventData = formatEventData(log.event_data);

            return (
              <div
                key={log.id}
                className="p-4 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                onClick={() => toggleExpanded(log.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleExpanded(log.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${style.bg} ${style.text}`}>
                      {log.severity.toUpperCase()}
                    </span>
                    <span className="font-medium">{log.event_type}</span>
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">
                    {formatRelativeTime(log.created_at)}
                  </span>
                </div>

                {eventData && (
                  <div className="ml-7 mb-1">
                    <span className="inline-flex items-center rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      {isExpanded ? 'Hide details' : 'View details'}
                    </span>
                  </div>
                )}

                {eventData && isExpanded && (
                  <div className="mt-3 ml-7">
                    <pre className="text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(eventData, null, 2)}
                    </pre>
                  </div>
                )}

                {!isExpanded && eventData && (
                  <p className="text-sm text-[var(--text-muted)] ml-7 truncate">
                    Expand to inspect structured event data.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </AdminPageShell>
  );
}
