'use client';

import { AdminBenchmarkConfigBuilder } from '@/features/admin/benchmark/components/AdminBenchmarkConfigBuilder';
import { AdminBenchmarkConfigsTable } from '@/features/admin/benchmark/components/AdminBenchmarkConfigsTable';
import { AdminBenchmarkCurrentLineup } from '@/features/admin/benchmark/components/AdminBenchmarkCurrentLineup';
import { AdminBenchmarkReleaseForm } from '@/features/admin/benchmark/components/AdminBenchmarkReleaseForm';
import { AdminBenchmarkRolloverPreview } from '@/features/admin/benchmark/components/AdminBenchmarkRolloverPreview';
import { useAdminBenchmarkController } from '@/features/admin/benchmark/useAdminBenchmarkController';
import { AdminLoginCard } from '@/features/admin/dashboard/components/AdminLoginCard';
import { AdminNavigationLinks } from '@/features/admin/dashboard/components/AdminNavigationLinks';
import { AdminResultBanner } from '@/features/admin/dashboard/components/AdminResultBanner';

export default function AdminBenchmarkPageClient() {
  const {
    password,
    isAuthenticated,
    hasResolvedAuth,
    error,
    loading,
    overview,
    result,
    releaseLoading,
    configLoading,
    promotingConfigId,
    previewingConfigId,
    applyingRollover,
    rolloverPreview,
    releaseState,
    configState,
    setPassword,
    setReleaseState,
    setConfigState,
    handleLogin,
    handleLogout,
    updateReleaseFamily,
    updateConfigAssignment,
    handleCreateRelease,
    handleCreateConfig,
    handlePromoteConfig,
    handlePreviewRollover,
    handleApplyRollover,
    dismissRolloverPreview
  } = useAdminBenchmarkController();

  if (!hasResolvedAuth) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="glass-card p-8 w-full max-w-md mx-auto text-center border border-[var(--border-medium)]">
          <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Benchmark Control</h1>
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

  if (!overview || !configState) {
    return (
      <div className="container-wide mx-auto px-6 py-12">
        <div className="glass-card p-8 text-center border border-[var(--border-medium)]">
          <h1 className="text-2xl font-bold mb-3">Benchmark Control</h1>
          <p className="text-[var(--text-secondary)]">Loading benchmark lineage data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide mx-auto px-6 py-12">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Benchmark Control</h1>
          <p className="text-[var(--text-secondary)]">
            Manage stable model families, exact releases, and future cohort lineups.
          </p>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>

      <AdminResultBanner result={result} />
      <AdminBenchmarkCurrentLineup overview={overview} />
      {rolloverPreview && (
        <AdminBenchmarkRolloverPreview
          preview={rolloverPreview}
          applying={applyingRollover}
          onApply={handleApplyRollover}
          onCancel={dismissRolloverPreview}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <AdminBenchmarkReleaseForm
          overview={overview}
          loading={releaseLoading}
          releaseState={releaseState}
          onFamilyChange={updateReleaseFamily}
          onStateChange={(updater) => setReleaseState((current) => updater(current))}
          onSubmit={handleCreateRelease}
        />
        <AdminBenchmarkConfigBuilder
          overview={overview}
          configState={configState}
          loading={configLoading}
          onStateChange={(updater) => setConfigState((current) => current ? updater(current) : current)}
          onAssignmentChange={updateConfigAssignment}
          onSubmit={handleCreateConfig}
        />
      </div>

      <div className="mb-8">
        <AdminBenchmarkConfigsTable
          overview={overview}
          promotingConfigId={promotingConfigId}
          previewingConfigId={previewingConfigId}
          onPromote={handlePromoteConfig}
          onPreviewRollover={handlePreviewRollover}
        />
      </div>

      <AdminNavigationLinks />
    </div>
  );
}
