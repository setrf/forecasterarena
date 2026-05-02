'use client';

import { AdminBenchmarkConfigBuilder } from '@/features/admin/benchmark/components/AdminBenchmarkConfigBuilder';
import { AdminBenchmarkConfigsTable } from '@/features/admin/benchmark/components/AdminBenchmarkConfigsTable';
import { AdminBenchmarkCurrentLineup } from '@/features/admin/benchmark/components/AdminBenchmarkCurrentLineup';
import { AdminBenchmarkLineupReviewPanel } from '@/features/admin/benchmark/components/AdminBenchmarkLineupReviewPanel';
import { AdminBenchmarkReleaseForm } from '@/features/admin/benchmark/components/AdminBenchmarkReleaseForm';
import { AdminPageShell } from '@/features/admin/components/AdminPageShell';
import { useAdminBenchmarkController } from '@/features/admin/benchmark/useAdminBenchmarkController';
import { AdminLoginCard } from '@/features/admin/dashboard/components/AdminLoginCard';
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
    checkingLineup,
    approvingReviewId,
    dismissingReviewId,
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
    handleCheckLineup,
    handleApproveLineupReview,
    handleDismissLineupReview,
  } = useAdminBenchmarkController();

  if (!hasResolvedAuth) {
    return (
      <AdminPageShell
        title="Benchmark Control"
        description="Manage stable model families, exact releases, and future cohort lineups."
      >
        <div className="glass-card mx-auto max-w-md p-8 text-center border border-[var(--border-medium)]">
          <h2 className="heading-block mb-3 text-[var(--text-primary)]">Checking admin session...</h2>
          <p className="text-[var(--text-secondary)]">Verifying your admin session before loading benchmark controls.</p>
        </div>
      </AdminPageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminPageShell
        title="Benchmark Control"
        description="Manage stable model families, exact releases, and future cohort lineups."
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

  if (!overview || !configState) {
    return (
      <AdminPageShell
        title="Benchmark Control"
        description="Manage stable model families, exact releases, and future cohort lineups."
      >
        <div className="glass-card mx-auto max-w-md p-8 text-center border border-[var(--border-medium)]">
          <h2 className="heading-block mb-3">Loading benchmark lineage data...</h2>
          <p className="text-[var(--text-secondary)]">Reading releases, configs, and current lineup details.</p>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Benchmark Control"
      description="Manage stable model families, exact releases, and future cohort lineups."
      actions={(
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      )}
    >
      <AdminResultBanner result={result} />
      <AdminBenchmarkCurrentLineup overview={overview} />
      <AdminBenchmarkLineupReviewPanel
        review={overview.latest_review}
        checking={checkingLineup}
        approvingReviewId={approvingReviewId}
        dismissingReviewId={dismissingReviewId}
        onCheck={handleCheckLineup}
        onApprove={handleApproveLineupReview}
        onDismiss={handleDismissLineupReview}
      />
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
          onPromote={handlePromoteConfig}
        />
      </div>
    </AdminPageShell>
  );
}
