'use client';

import { useEffect, useState } from 'react';
import { AdminExportSection } from '@/features/admin/dashboard/components/AdminExportSection';
import { AdminLoginCard } from '@/features/admin/dashboard/components/AdminLoginCard';
import { AdminNavigationLinks } from '@/features/admin/dashboard/components/AdminNavigationLinks';
import { AdminQuickActions } from '@/features/admin/dashboard/components/AdminQuickActions';
import { AdminResultBanner } from '@/features/admin/dashboard/components/AdminResultBanner';
import { AdminStatsGrid } from '@/features/admin/dashboard/components/AdminStatsGrid';
import type { AdminStats, ExportState, ResultMessage } from '@/features/admin/dashboard/types';
import { getAdminActionSuccessMessage } from '@/features/admin/dashboard/utils';

const initialExportState: ExportState = {
  cohortId: '',
  from: '',
  to: '',
  includePrompts: false
};

export default function AdminDashboardPageClient() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<ResultMessage | null>(null);
  const [exportState, setExportState] = useState<ExportState>(initialExportState);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<ResultMessage | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
          return;
        }

        const json = await response.json();
        setStats(json);
      } catch (fetchError) {
        console.error('Error fetching stats:', fetchError);
      }
    }

    fetchStats();
  }, [isAuthenticated]);

  async function refreshStats() {
    const response = await fetch('/api/admin/stats');
    if (!response.ok) {
      return;
    }

    const json = await response.json();
    setStats(json);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        const json = await response.json();
        setError(json.error || 'Invalid password');
      }
    } catch {
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
      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          force: action === 'start-cohort' ? true : undefined
        })
      });
      const json = await response.json();

      if (response.ok && json.success) {
        setActionResult({ type: 'success', message: getAdminActionSuccessMessage(action, json) });
        await refreshStats();
      } else {
        setActionResult({ type: 'error', message: json.error || json.message || 'Action failed' });
      }
    } catch {
      setActionResult({ type: 'error', message: 'Connection error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExport(event: React.FormEvent) {
    event.preventDefault();
    setExportLoading(true);
    setExportResult(null);

    try {
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohort_id: exportState.cohortId,
          from: exportState.from,
          to: exportState.to,
          include_prompts: exportState.includePrompts
        })
      });

      const json = await response.json();
      if (response.ok && json.success && json.download_url) {
        setExportResult({
          type: 'success',
          message: 'Export ready. Click to download.',
          link: json.download_url
        });
      } else {
        setExportResult({
          type: 'error',
          message: json.error || json.message || 'Export failed'
        });
      }
    } catch {
      setExportResult({ type: 'error', message: 'Connection error' });
    } finally {
      setExportLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <AdminLoginCard
        password={password}
        error={error}
        loading={loading}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
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

      <AdminResultBanner result={actionResult} />
      <AdminQuickActions
        actionLoading={actionLoading}
        onExecuteAction={executeAction}
      />
      <AdminStatsGrid stats={stats} />
      <AdminExportSection
        exportState={exportState}
        exportLoading={exportLoading}
        exportResult={exportResult}
        onStateChange={(updater) => setExportState((current) => updater(current))}
        onSubmit={handleExport}
      />
      <AdminNavigationLinks />
    </div>
  );
}
