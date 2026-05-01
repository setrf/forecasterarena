import type {
  BenchmarkOverview,
  ConfigAssignmentState,
  ConfigFormState
} from '@/features/admin/benchmark/types';

interface AdminBenchmarkConfigBuilderProps {
  overview: BenchmarkOverview;
  configState: ConfigFormState;
  loading: boolean;
  onStateChange: (updater: (state: ConfigFormState) => ConfigFormState) => void;
  onAssignmentChange: (
    familyId: string,
    updater: (assignment: ConfigAssignmentState) => ConfigAssignmentState
  ) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function AdminBenchmarkConfigBuilder({
  overview,
  configState,
  loading,
  onStateChange,
  onAssignmentChange,
  onSubmit
}: AdminBenchmarkConfigBuilderProps) {
  return (
    <div className="glass-card p-6 border border-[var(--border-medium)]">
      <div className="mb-4">
        <h2 className="heading-block">Create Benchmark Config</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Assemble a future cohort lineup by pinning one release per active family.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="benchmark-config-version" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Version Name</label>
            <input
              id="benchmark-config-version"
              type="text"
              value={configState.versionName}
              onChange={(event) => onStateChange((state) => ({ ...state, versionName: event.target.value }))}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
              placeholder="lineup-2026-03-gpt54"
              required
            />
          </div>
          <div>
            <label htmlFor="benchmark-config-methodology" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Methodology Version</label>
            <input
              id="benchmark-config-methodology"
              type="text"
              value={configState.methodologyVersion}
              onChange={(event) => onStateChange((state) => ({ ...state, methodologyVersion: event.target.value }))}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="benchmark-config-notes" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Notes</label>
          <textarea
            id="benchmark-config-notes"
            value={configState.notes}
            onChange={(event) => onStateChange((state) => ({ ...state, notes: event.target.value }))}
            className="w-full min-h-[96px] px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
            placeholder="Why this lineup exists, what changed, and what to watch."
          />
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Family</th>
                <th>Release</th>
                <th className="text-right">Input / 1M</th>
                <th className="text-right">Output / 1M</th>
              </tr>
            </thead>
            <tbody>
              {configState.assignments.map((assignment) => {
                const family = overview.families.find((item) => item.id === assignment.familyId)!;

                return (
                  <tr key={assignment.familyId}>
                    <td>{family.public_display_name}</td>
                    <td>
                      <select
                        aria-label={`${family.public_display_name} release`}
                        value={assignment.releaseId}
                        onChange={(event) => {
                          const nextRelease = family.releases.find((release) => release.id === event.target.value);
                          onAssignmentChange(assignment.familyId, (current) => ({
                            ...current,
                            releaseId: event.target.value,
                            inputPricePerMillion: String(
                              nextRelease?.default_input_price_per_million ?? current.inputPricePerMillion
                            ),
                            outputPricePerMillion: String(
                              nextRelease?.default_output_price_per_million ?? current.outputPricePerMillion
                            )
                          }));
                        }}
                        className="w-full min-w-[180px] px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
                      >
                        {family.releases.map((release) => (
                          <option key={release.id} value={release.id}>{release.release_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="text-right">
                      <input
                        aria-label={`${family.public_display_name} input price`}
                        type="number"
                        min="0"
                        step="any"
                        value={assignment.inputPricePerMillion}
                        onChange={(event) => onAssignmentChange(assignment.familyId, (current) => ({ ...current, inputPricePerMillion: event.target.value }))}
                        className="w-28 ml-auto px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none text-right"
                      />
                    </td>
                    <td className="text-right">
                      <input
                        aria-label={`${family.public_display_name} output price`}
                        type="number"
                        min="0"
                        step="any"
                        value={assignment.outputPricePerMillion}
                        onChange={(event) => onAssignmentChange(assignment.familyId, (current) => ({ ...current, outputPricePerMillion: event.target.value }))}
                        className="w-28 ml-auto px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none text-right"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Creating...' : 'Create Benchmark Config'}
        </button>
      </form>
    </div>
  );
}
