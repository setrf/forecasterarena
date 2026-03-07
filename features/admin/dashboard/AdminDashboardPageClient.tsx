'use client';

import { AdminExportSection } from '@/features/admin/dashboard/components/AdminExportSection';
import { AdminLoginCard } from '@/features/admin/dashboard/components/AdminLoginCard';
import { AdminNavigationLinks } from '@/features/admin/dashboard/components/AdminNavigationLinks';
import { AdminQuickActions } from '@/features/admin/dashboard/components/AdminQuickActions';
import { AdminResultBanner } from '@/features/admin/dashboard/components/AdminResultBanner';
import { AdminStatsGrid } from '@/features/admin/dashboard/components/AdminStatsGrid';
import { useAdminDashboardController } from '@/features/admin/dashboard/useAdminDashboardController';

export default function AdminDashboardPageClient() {
  const {
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
  } = useAdminDashboardController();

  if (!hasResolvedAuth) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="glass-card p-8 w-full max-w-md mx-auto text-center border border-[var(--border-medium)]">
          <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Admin Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Checking admin session...</p>
        </div>
      </div>
    );
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
