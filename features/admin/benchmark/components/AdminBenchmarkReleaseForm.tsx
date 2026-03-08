import type { BenchmarkOverview, ReleaseFormState } from '@/features/admin/benchmark/types';

interface AdminBenchmarkReleaseFormProps {
  overview: BenchmarkOverview;
  loading: boolean;
  releaseState: ReleaseFormState;
  onFamilyChange: (familyId: string) => void;
  onStateChange: (updater: (state: ReleaseFormState) => ReleaseFormState) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function AdminBenchmarkReleaseForm({
  overview,
  loading,
  releaseState,
  onFamilyChange,
  onStateChange,
  onSubmit
}: AdminBenchmarkReleaseFormProps) {
  const selectedFamily = overview.families.find((family) => family.id === releaseState.familyId) ?? overview.families[0];

  return (
    <div className="glass-card p-6 border border-[var(--border-medium)]">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Register Release</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Add a new exact release for an existing benchmark family without rewriting history.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="benchmark-family-select" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Family</label>
          <select
            id="benchmark-family-select"
            value={releaseState.familyId}
            onChange={(event) => onFamilyChange(event.target.value)}
            className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
          >
            {overview.families.map((family) => (
              <option key={family.id} value={family.id}>{family.public_display_name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="benchmark-release-name" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Release Name</label>
            <input
              id="benchmark-release-name"
              type="text"
              value={releaseState.releaseName}
              onChange={(event) => onStateChange((state) => ({ ...state, releaseName: event.target.value }))}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
              placeholder="GPT-5.4"
              required
            />
          </div>
          <div>
            <label htmlFor="benchmark-openrouter-id" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">OpenRouter ID</label>
            <input
              id="benchmark-openrouter-id"
              type="text"
              value={releaseState.openrouterId}
              onChange={(event) => onStateChange((state) => ({ ...state, openrouterId: event.target.value }))}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
              placeholder="openai/gpt-5.4"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="benchmark-input-price" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Input Price / 1M</label>
            <input
              id="benchmark-input-price"
              type="number"
              min="0"
              step="0.01"
              value={releaseState.inputPricePerMillion}
              onChange={(event) => onStateChange((state) => ({ ...state, inputPricePerMillion: event.target.value }))}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="benchmark-output-price" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Output Price / 1M</label>
            <input
              id="benchmark-output-price"
              type="number"
              min="0"
              step="0.01"
              value={releaseState.outputPricePerMillion}
              onChange={(event) => onStateChange((state) => ({ ...state, outputPricePerMillion: event.target.value }))}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="benchmark-release-notes" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Notes</label>
          <textarea
            id="benchmark-release-notes"
            value={releaseState.notes}
            onChange={(event) => onStateChange((state) => ({ ...state, notes: event.target.value }))}
            className="w-full min-h-[96px] px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
            placeholder="Optional operator note about this release"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Registering...' : 'Register Release'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
        <div className="text-sm font-medium mb-3 text-[var(--text-secondary)]">
          Existing releases for {selectedFamily?.public_display_name ?? 'this family'}
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedFamily?.releases.map((release) => (
            <span
              key={release.id}
              className="px-3 py-1 rounded-full text-sm bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]"
            >
              {release.release_name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
