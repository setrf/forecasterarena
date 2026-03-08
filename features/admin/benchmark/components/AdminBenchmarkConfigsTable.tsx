import type { BenchmarkOverview } from '@/features/admin/benchmark/types';

interface AdminBenchmarkConfigsTableProps {
  overview: BenchmarkOverview;
  promotingConfigId: string | null;
  previewingConfigId: string | null;
  onPromote: (configId: string) => void;
  onPreviewRollover: (configId: string) => void;
}

export function AdminBenchmarkConfigsTable({
  overview,
  promotingConfigId,
  previewingConfigId,
  onPromote,
  onPreviewRollover
}: AdminBenchmarkConfigsTableProps) {
  return (
    <div className="glass-card p-6 border border-[var(--border-medium)]">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Recent Benchmark Configs</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Promotion changes the default lineup for future cohorts. Use active rollover preview to see and confirm immediate changes for running cohorts.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Methodology</th>
              <th>Lineup</th>
              <th>Created</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {overview.configs.map((config) => {
              const isDefault = config.id === overview.default_config_id;

              return (
                <tr key={config.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span>{config.version_name}</span>
                      {isDefault ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-[rgba(16,185,129,0.12)] text-[var(--accent-emerald)] border border-[rgba(16,185,129,0.3)]">
                          Default
                        </span>
                      ) : null}
                    </div>
                    {config.notes ? (
                      <div className="text-sm text-[var(--text-muted)] mt-1">{config.notes}</div>
                    ) : null}
                  </td>
                  <td>{config.methodology_version}</td>
                  <td className="text-sm text-[var(--text-muted)]">
                    {config.models.map((model) => `${model.family_display_name_snapshot}: ${model.release_display_name_snapshot}`).join(', ')}
                  </td>
                  <td>{new Date(config.created_at).toLocaleString()}</td>
                  <td className="text-right">
                    {isDefault ? (
                      <span className="text-[var(--text-muted)] text-sm">In use</span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onPreviewRollover(config.id)}
                          disabled={promotingConfigId !== null || previewingConfigId !== null}
                          className="btn btn-secondary text-sm"
                        >
                          {previewingConfigId === config.id ? 'Previewing...' : 'Preview active rollout'}
                        </button>
                        <button
                          onClick={() => onPromote(config.id)}
                          disabled={promotingConfigId !== null || previewingConfigId !== null}
                          className="btn btn-secondary text-sm"
                        >
                          {promotingConfigId === config.id ? 'Promoting...' : `Promote default`}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
