import type { BenchmarkRolloverPreview } from '@/features/admin/benchmark/types';

interface AdminBenchmarkRolloverPreviewProps {
  preview: BenchmarkRolloverPreview;
  applying: boolean;
  onApply: () => void;
  onCancel: () => void;
}

export function AdminBenchmarkRolloverPreview({
  preview,
  applying,
  onApply,
  onCancel
}: AdminBenchmarkRolloverPreviewProps) {
  return (
    <div className="glass-card p-6 border border-[var(--border-medium)] mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold">Active Cohort Rollover Preview</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            This applies <span className="font-medium text-[var(--text-primary)]">{preview.version_name}</span> to all active cohorts immediately.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn btn-secondary" disabled={applying}>
            Cancel
          </button>
          <button onClick={onApply} className="btn btn-primary" disabled={applying}>
            {applying ? 'Applying...' : 'Apply to Active Cohorts'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Active Cohorts</div>
          <div className="text-2xl font-semibold mt-1">{preview.active_cohorts}</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Active Agents</div>
          <div className="text-2xl font-semibold mt-1">{preview.active_agents}</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Cohorts Touched</div>
          <div className="text-2xl font-semibold mt-1">{preview.impacted_cohorts}</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Agent Slots Changed</div>
          <div className="text-2xl font-semibold mt-1">{preview.impacted_agents}</div>
        </div>
      </div>

      <div className="space-y-2">
        {preview.family_changes.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)]">No active agents would change.</div>
        ) : preview.family_changes.map((change) => (
          <div
            key={change.family_id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
          >
            <span className="font-medium">{change.family_name}</span>
            <span className="text-[var(--text-muted)]">{change.from_release_name ?? 'Unknown current release'}</span>
            <span className="text-[var(--text-muted)]">to</span>
            <span className="font-medium text-[var(--text-primary)]">{change.to_release_name}</span>
            <span className="ml-auto text-[var(--text-muted)]">{change.affected_agents} active agent(s)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
