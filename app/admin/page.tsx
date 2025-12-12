'use client';

import { useState, useEffect } from 'react';

interface AdminStats {
  active_cohorts: number;
  total_agents: number;
  markets_tracked: number;
  total_api_cost: number;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [exportState, setExportState] = useState({
    cohortId: '',
    from: '',
    to: '',
    includePrompts: false,
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<{ type: 'success' | 'error'; message: string; link?: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setIsAuthenticated(false);
    setPassword('');
    setStats(null);
  }

  async function executeAction(action: string) {
    setActionLoading(action);
    setActionResult(null);

    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          force: action === 'start-cohort' ? true : undefined
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setActionResult({ type: 'success', message: getSuccessMessage(action, data) });
        fetchStats(); // Refresh stats
      } else {
        setActionResult({ type: 'error', message: data.error || data.message || 'Action failed' });
      }
    } catch (err) {
      setActionResult({ type: 'error', message: 'Connection error' });
    } finally {
      setActionLoading(null);
    }
  }

  function getSuccessMessage(action: string, data: Record<string, unknown>): string {
    switch (action) {
      case 'start-cohort':
        return `Cohort #${data.cohort_number || 'new'} started successfully`;
      case 'sync-markets':
        return `Synced ${data.markets_added || 0} new, ${data.markets_updated || 0} updated`;
      case 'backup':
        return `Backup created successfully`;
      default:
        return 'Action completed';
    }
  }

  async function handleExport(e: React.FormEvent) {
    e.preventDefault();
    setExportLoading(true);
    setExportResult(null);

    try {
      const res = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohort_id: exportState.cohortId,
          from: exportState.from,
          to: exportState.to,
          include_prompts: exportState.includePrompts,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.download_url) {
        setExportResult({
          type: 'success',
          message: 'Export ready. Click to download.',
          link: data.download_url,
        });
      } else {
        setExportResult({
          type: 'error',
          message: data.error || data.message || 'Export failed',
        });
      }
    } catch (err) {
      setExportResult({ type: 'error', message: 'Connection error' });
    } finally {
      setExportLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="glass-card p-8 w-full max-w-md mx-auto relative z-10 bg-[var(--bg-card)] border-2 border-[var(--border-medium)] shadow-xl">
          <h1 className="text-2xl font-bold mb-6 text-center text-[var(--text-primary)]">Admin Login</h1>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm text-[var(--text-secondary)] mb-2 font-medium">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
                placeholder="Enter admin password"
                required
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg text-sm text-[var(--accent-rose)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-[var(--text-secondary)]">
            System status and controls
          </p>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>

      {/* Action Result */}
      {actionResult && (
        <div className={`mb-6 p-4 rounded-lg ${actionResult.type === 'success'
            ? 'bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[var(--accent-emerald)]'
            : 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[var(--accent-rose)]'
          }`}>
          {actionResult.message}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <button
          onClick={() => executeAction('start-cohort')}
          disabled={actionLoading !== null}
          className="stat-card text-left hover:border-[var(--accent-blue)] transition-colors group disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Start New Cohort</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {actionLoading === 'start-cohort' ? 'Starting...' : 'Force start a new cohort'}
              </p>
            </div>
            <svg className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </button>

        <button
          onClick={() => executeAction('sync-markets')}
          disabled={actionLoading !== null}
          className="stat-card text-left hover:border-[var(--accent-emerald)] transition-colors group disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Sync Markets</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {actionLoading === 'sync-markets' ? 'Syncing...' : 'Fetch latest from Polymarket'}
              </p>
            </div>
            <svg className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-emerald)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </button>

        <button
          onClick={() => executeAction('backup')}
          disabled={actionLoading !== null}
          className="stat-card text-left hover:border-[var(--accent-violet)] transition-colors group disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Create Backup</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {actionLoading === 'backup' ? 'Creating...' : 'Backup database now'}
              </p>
            </div>
            <svg className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </div>
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="stat-card">
          <div className="stat-value">{stats?.active_cohorts ?? '...'}</div>
          <div className="stat-label">Active Cohorts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_agents ?? '...'}</div>
          <div className="stat-label">Total Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.markets_tracked ?? '...'}</div>
          <div className="stat-label">Markets Tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {stats ? `$${stats.total_api_cost.toFixed(2)}` : '...'}
          </div>
          <div className="stat-label">API Costs (Total)</div>
        </div>
      </div>

      {/* Export Section */}
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

        <form onSubmit={handleExport} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Cohort ID</label>
            <input
              type="text"
              required
              value={exportState.cohortId}
              onChange={(e) => setExportState((s) => ({ ...s, cohortId: e.target.value }))}
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
                onChange={(e) => setExportState((s) => ({ ...s, from: e.target.value }))}
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
                onChange={(e) => setExportState((s) => ({ ...s, to: e.target.value }))}
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
              onChange={(e) => setExportState((s) => ({ ...s, includePrompts: e.target.checked }))}
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

      {/* Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <a href="/admin/logs" className="glass-card p-6 hover:border-[var(--border-medium)] transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
              📋
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-gradient">System Logs</h3>
              <p className="text-sm text-[var(--text-muted)]">View recent system events</p>
            </div>
          </div>
        </a>

        <a href="/admin/costs" className="glass-card p-6 hover:border-[var(--border-medium)] transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-lg font-bold">
              $
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-gradient">API Costs</h3>
              <p className="text-sm text-[var(--text-muted)]">Track OpenRouter spending</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
