import type { BenchmarkOverview } from '@/features/admin/benchmark/types';

interface AdminBenchmarkCurrentLineupProps {
  overview: BenchmarkOverview;
}

export function AdminBenchmarkCurrentLineup({ overview }: AdminBenchmarkCurrentLineupProps) {
  const defaultConfig = overview.configs.find((config) => config.id === overview.default_config_id) ?? null;

  return (
    <div className="glass-card p-6 mb-8 border border-[var(--border-medium)]">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="heading-block">Current Default Lineup</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Future cohorts will freeze this benchmark config unless a different config is promoted.
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-[var(--text-muted)]">Default Config</div>
          <div className="font-medium">{defaultConfig?.version_name ?? 'None configured'}</div>
        </div>
      </div>

      {defaultConfig ? (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Family</th>
                <th>Release</th>
                <th>OpenRouter</th>
                <th className="text-right">Input / 1M</th>
                <th className="text-right">Output / 1M</th>
              </tr>
            </thead>
            <tbody>
              {defaultConfig.models.map((model) => (
                <tr key={model.id}>
                  <td>{model.family_display_name_snapshot}</td>
                  <td>{model.release_display_name_snapshot}</td>
                  <td className="font-mono text-sm">{model.openrouter_id_snapshot}</td>
                  <td className="text-right font-mono">${model.input_price_per_million_snapshot.toFixed(2)}</td>
                  <td className="text-right font-mono">${model.output_price_per_million_snapshot.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-[var(--text-muted)]">No default benchmark config is configured.</div>
      )}
    </div>
  );
}
