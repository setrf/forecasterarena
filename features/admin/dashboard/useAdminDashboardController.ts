'use client';

import { useEffect, useState } from 'react';
import {
  createAdminExport,
  fetchAdminStats,
  loginAdmin,
  logoutAdmin,
  runAdminAction
} from '@/features/admin/dashboard/api';
import type { AdminStatsFetchResult } from '@/features/admin/dashboard/api';
import { initialExportState } from '@/features/admin/dashboard/constants';
import type { AdminStats, ExportState, ResultMessage } from '@/features/admin/dashboard/types';

export function applyAdminStatsFetchResult(
  currentStats: AdminStats | null,
  result: AdminStatsFetchResult
): {
  isAuthenticated: boolean;
  stats: AdminStats | null;
} {
  if (result.kind === 'unauthorized') {
    return {
      isAuthenticated: false,
      stats: null
    };
  }

  return {
    isAuthenticated: true,
    stats: result.stats ?? currentStats
  };
}

export async function loadAdminStats(
  currentStats: AdminStats | null
): Promise<{
  isAuthenticated: boolean;
  stats: AdminStats | null;
}> {
  return applyAdminStatsFetchResult(currentStats, await fetchAdminStats());
}

export function useAdminDashboardController() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasResolvedAuth, setHasResolvedAuth] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [hasLoadedStats, setHasLoadedStats] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<ResultMessage | null>(null);
  const [exportState, setExportState] = useState<ExportState>(initialExportState);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<ResultMessage | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrateAdminSession() {
      try {
        const existingStats = await loadAdminStats(null);
        if (cancelled) {
          return;
        }

        setIsAuthenticated(existingStats.isAuthenticated);
        setStats(existingStats.stats);
        setHasLoadedStats(existingStats.isAuthenticated);
      } catch (fetchError) {
        console.error('Error restoring admin session:', fetchError);
      } finally {
        if (!cancelled) {
          setHasResolvedAuth(true);
        }
      }
    }

    void hydrateAdminSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasResolvedAuth || !isAuthenticated || hasLoadedStats) {
      return;
    }

    async function loadStats() {
      try {
        const nextState = await loadAdminStats(stats);
        setIsAuthenticated(nextState.isAuthenticated);
        setStats(nextState.stats);
        setHasLoadedStats(true);
      } catch (fetchError) {
        console.error('Error fetching stats:', fetchError);
      }
    }

    void loadStats();
  }, [hasResolvedAuth, hasLoadedStats, isAuthenticated, stats]);

  async function refreshStats() {
    const nextState = await loadAdminStats(stats);
    setIsAuthenticated(nextState.isAuthenticated);
    setStats(nextState.stats);
    setHasLoadedStats(true);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await loginAdmin(password);
      if (result.success) {
        setIsAuthenticated(true);
        setHasResolvedAuth(true);
        setHasLoadedStats(false);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logoutAdmin();
    setIsAuthenticated(false);
    setHasResolvedAuth(true);
    setHasLoadedStats(false);
    setPassword('');
    setStats(null);
  }

  async function executeAction(action: string) {
    setActionLoading(action);
    setActionResult(null);

    try {
      const result = await runAdminAction(action);
      setActionResult(result);

      if (result.type === 'success') {
        await refreshStats();
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
      setExportResult(await createAdminExport(exportState));
    } catch {
      setExportResult({ type: 'error', message: 'Connection error' });
    } finally {
      setExportLoading(false);
    }
  }

  return {
    password,
    isAuthenticated,
    hasResolvedAuth,
    error,
    loading,
    stats,
    actionLoading,
    actionResult,
    exportState,
    exportLoading,
    exportResult,
    setPassword,
    setExportState,
    handleLogin,
    handleLogout,
    executeAction,
    handleExport
  };
}
