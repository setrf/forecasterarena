'use client';

import { AdminPageShell } from '@/features/admin/components/AdminPageShell';
import { AdminExportSection } from '@/features/admin/dashboard/components/AdminExportSection';
import { AdminLoginCard } from '@/features/admin/dashboard/components/AdminLoginCard';
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
      <AdminPageShell
        title="Admin Dashboard"
        description="System status, operational controls, and export tooling."
      >
        <div className="glass-card mx-auto max-w-md p-8 text-center border border-[var(--border-medium)]">
          <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Checking admin session...</h2>
          <p className="text-[var(--text-secondary)]">Verifying your existing admin cookie before loading controls.</p>
        </div>
      </AdminPageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminPageShell
        title="Admin Dashboard"
        description="System status, operational controls, and export tooling."
      >
        <AdminLoginCard
          password={password}
          error={error}
          loading={loading}
          embedded
          onPasswordChange={setPassword}
          onSubmit={handleLogin}
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Admin Dashboard"
      description="System status, operational controls, and export tooling."
      actions={(
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      )}
    >
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
    </AdminPageShell>
  );
}
