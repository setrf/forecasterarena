import type { ExportState, ResultMessage } from '@/features/admin/dashboard/types';

interface AdminExportSectionProps {
  exportState: ExportState;
  exportLoading: boolean;
  exportResult: ResultMessage | null;
  onStateChange: (updater: (state: ExportState) => ExportState) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function AdminExportSection({
  exportState,
  exportLoading,
  exportResult,
  onStateChange,
  onSubmit
}: AdminExportSectionProps) {
  function toLocalInputValue(isoValue: string) {
    if (!isoValue) return '';
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
  }

  function toIsoValue(localValue: string) {
    if (!localValue) return '';
    const date = new Date(localValue);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString();
  }

  function applyPreset(hours: number) {
    const to = new Date();
    const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
    onStateChange((state) => ({
      ...state,
      from: from.toISOString(),
      to: to.toISOString()
    }));
  }

  return (
    <div className="glass-card p-6 mb-10 border border-[var(--border-medium)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="heading-card">Export Data (CSV + zip)</h3>
          <p className="text-sm text-[var(--text-muted)]">Admin-only, capped to 7 days / 50k rows per table</p>
        </div>
      </div>

      {exportResult && (
        <div className={`mb-4 p-3 rounded-lg ${exportResult.type === 'success'
          ? 'bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[var(--accent-emerald)]'
          : 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[var(--accent-rose)]'
        }`}>
          <div className="flex items-center justify-between">
            <span>{exportResult.message}</span>
            {exportResult.link && (
              <a
                href={exportResult.link}
                className="btn btn-primary btn-sm"
                download
              >
                Download
              </a>
            )}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="admin-export-cohort-id" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Cohort ID</label>
          <input
            id="admin-export-cohort-id"
            type="text"
            required
            value={exportState.cohortId}
            onChange={(event) => onStateChange((state) => ({ ...state, cohortId: event.target.value }))}
            className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
            placeholder="e.g. 1765150233693-eqaag1un5 (cohort UUID)"
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Use the cohort UUID from the cohorts page or admin dashboard.
            {' '}
            <a href="/cohorts" target="_blank" rel="noreferrer" className="text-[var(--accent-gold)] hover:text-[var(--accent-gold-muted)]">
              Open cohorts list
            </a>
            {' '}
            to copy an ID.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="admin-export-from" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">From</label>
            <input
              id="admin-export-from"
              type="datetime-local"
              required
              value={toLocalInputValue(exportState.from)}
              onChange={(event) => onStateChange((state) => ({ ...state, from: toIsoValue(event.target.value) }))}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="admin-export-to" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">To</label>
            <input
              id="admin-export-to"
              type="datetime-local"
              required
              value={toLocalInputValue(exportState.to)}
              onChange={(event) => onStateChange((state) => ({ ...state, to: toIsoValue(event.target.value) }))}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
            />
          </div>
        </div>
        <div className="md:col-span-2 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Quick range</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset(24)}>Last 24h</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset(72)}>Last 72h</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset(168)}>Last 7d</button>
          <span className="text-xs text-[var(--text-muted)]">Times are entered in your local timezone and sent as UTC.</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="include-prompts"
            type="checkbox"
            checked={exportState.includePrompts}
            onChange={(event) => onStateChange((state) => ({ ...state, includePrompts: event.target.checked }))}
            className="h-4 w-4"
          />
          <label htmlFor="include-prompts" className="text-sm text-[var(--text-secondary)]">
            Include prompts/responses (decisions)
          </label>
        </div>
        <div className="flex items-center md:justify-end">
          <button
            type="submit"
            disabled={exportLoading}
            className="btn btn-primary"
          >
            {exportLoading ? 'Preparing...' : 'Generate Export'}
          </button>
        </div>
      </form>
    </div>
  );
}
