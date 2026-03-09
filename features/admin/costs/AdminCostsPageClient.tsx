'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AdminEmptyState } from '@/features/admin/components/AdminEmptyState';
import { AdminPageShell } from '@/features/admin/components/AdminPageShell';
import type { CostByModel } from '@/features/admin/costs/types';
import { useAdminCostsData } from '@/features/admin/costs/useAdminCostsData';
import { formatCost, formatTokens } from '@/features/admin/costs/utils';

export default function AdminCostsPageClient() {
  const { costsByModel, summary, loading, error, chartData } = useAdminCostsData();
  const locked = Boolean(error && error.toLowerCase().includes('authentication required'));

  if (locked) {
    return (
      <AdminPageShell
        title="API Costs"
        description="Track OpenRouter API spending across all model families."
      >
        <AdminEmptyState
          title="Admin authentication required"
          description="This screen only loads after a valid admin session is established. Log in through the dashboard first, then return here for family-level spend, token usage, and detailed breakdowns."
          actionLabel="Open Admin Dashboard"
          actionHref="/admin"
        />
      </AdminPageShell>
    );
  }

  if (error) {
    return (
      <AdminPageShell
        title="API Costs"
        description="Track OpenRouter API spending across all model families."
      >
        <AdminEmptyState
          title="Unable to load cost data"
          description={error}
          actionLabel="Return to Admin"
          actionHref="/admin"
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="API Costs"
      description="Track OpenRouter API spending across all model families."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value">
            {loading ? '...' : formatCost(summary?.total_cost || 0)}
          </div>
          <div className="stat-label">Total Spend</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {loading ? '...' : summary?.total_decisions || 0}
          </div>
          <div className="stat-label">Total Decisions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {loading ? '...' : formatCost(summary?.avg_cost_per_decision || 0)}
          </div>
          <div className="stat-label">Avg per Decision</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {loading ? '...' : formatTokens((summary?.total_input_tokens || 0) + (summary?.total_output_tokens || 0))}
          </div>
          <div className="stat-label">Total Tokens</div>
        </div>
      </div>

      <div className="glass-card p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Spend by Model Family</h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
            Loading...
          </div>
        ) : chartData.length === 0 ? (
          <AdminEmptyState
            title="No spend recorded yet"
            description="API cost rows will appear after decision runs complete. Once usage lands, this chart will rank model families by total spend."
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {chartData.map((entry) => (
                <div key={entry.family_slug} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/65 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="font-medium">{entry.model_name}</span>
                    </div>
                    <span className="font-mono text-sm">{formatCost(entry.total_cost)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-[var(--text-muted)]">
                    <div>
                      <div className="uppercase tracking-[0.14em]">Decisions</div>
                      <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">{entry.decision_count}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.14em]">Input</div>
                      <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">{formatTokens(entry.total_input_tokens)}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.14em]">Output</div>
                      <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">{formatTokens(entry.total_output_tokens)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                    stroke="var(--text-muted)"
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="model_name"
                    stroke="var(--text-muted)"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    width={90}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as CostByModel;
                      return (
                        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-3 shadow-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                            <span className="font-medium">{data.model_name}</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-muted)]">Total Cost:</span>
                              <span className="font-mono">{formatCost(data.total_cost)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-muted)]">Decisions:</span>
                              <span>{data.decision_count}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-muted)]">Input Tokens:</span>
                              <span>{formatTokens(data.total_input_tokens)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-muted)]">Output Tokens:</span>
                              <span>{formatTokens(data.total_output_tokens)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="total_cost" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
        {loading ? (
          <div className="py-8 text-center text-[var(--text-muted)]">Loading...</div>
        ) : costsByModel.length === 0 ? (
          <AdminEmptyState
            title="No detailed rows yet"
            description="Once decisions start spending tokens, this table will break out total cost, token volume, and average spend per decision for each family."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Family</th>
                  <th className="text-right">Decisions</th>
                  <th className="text-right">Input Tokens</th>
                  <th className="text-right">Output Tokens</th>
                  <th className="text-right">Total Cost</th>
                  <th className="text-right">Avg / Decision</th>
                </tr>
              </thead>
              <tbody>
                {costsByModel.map((model) => (
                  <tr key={model.family_slug}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: model.color }}
                        />
                        {model.model_name}
                      </div>
                    </td>
                    <td className="text-right">{model.decision_count}</td>
                    <td className="text-right font-mono">{formatTokens(model.total_input_tokens)}</td>
                    <td className="text-right font-mono">{formatTokens(model.total_output_tokens)}</td>
                    <td className="text-right font-mono font-medium">{formatCost(model.total_cost)}</td>
                    <td className="text-right font-mono text-[var(--text-muted)]">
                      {model.decision_count > 0 ? formatCost(model.total_cost / model.decision_count) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}
