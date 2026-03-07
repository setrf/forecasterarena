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
  return (
    <div className="glass-card p-6 mb-10 border border-[var(--border-medium)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Export Data (CSV + zip)</h3>
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
          <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Cohort ID</label>
          <input
            type="text"
            required
            value={exportState.cohortId}
            onChange={(event) => onStateChange((state) => ({ ...state, cohortId: event.target.value }))}
            className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
            placeholder="e.g. 1765150233693-eqaag1un5 (cohort UUID)"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">From (ISO)</label>
            <input
              type="text"
              required
              value={exportState.from}
              onChange={(event) => onStateChange((state) => ({ ...state, from: event.target.value }))}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
              placeholder="2025-12-01T00:00:00Z"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">To (ISO)</label>
            <input
              type="text"
              required
              value={exportState.to}
              onChange={(event) => onStateChange((state) => ({ ...state, to: event.target.value }))}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
              placeholder="2025-12-03T00:00:00Z"
            />
          </div>
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
