import type { AdminStats, ExportState, ResultMessage } from '@/features/admin/dashboard/types';
import { getAdminActionSuccessMessage } from '@/features/admin/dashboard/utils';

export type AdminStatsFetchResult =
  | { kind: 'unauthorized' }
  | { kind: 'authenticated'; stats: AdminStats | null };

export async function fetchAdminStats(): Promise<AdminStatsFetchResult> {
  const response = await fetch('/api/admin/stats', {
    cache: 'no-store'
  });

  if (response.status === 401) {
    return { kind: 'unauthorized' };
  }

  if (!response.ok) {
    return { kind: 'authenticated', stats: null };
  }

  return {
    kind: 'authenticated',
    stats: await response.json() as AdminStats
  };
}

export async function loginAdmin(password: string): Promise<{
  success: boolean;
  error: string;
}> {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  if (response.ok) {
    return { success: true, error: '' };
  }

  const json = await response.json() as { error?: string };
  return {
    success: false,
    error: json.error || 'Invalid password'
  };
}

export async function logoutAdmin(): Promise<void> {
  await fetch('/api/admin/login', { method: 'DELETE' });
}

export async function runAdminAction(action: string): Promise<ResultMessage> {
  const response = await fetch('/api/admin/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      force: action === 'start-cohort' ? true : undefined
    })
  });
  const json = await response.json() as Record<string, unknown> & {
    success?: boolean;
    error?: string;
    message?: string;
  };

  if (response.ok && json.success) {
    return {
      type: 'success',
      message: getAdminActionSuccessMessage(action, json)
    };
  }

  return {
    type: 'error',
    message: json.error || json.message || 'Action failed'
  };
}

export async function createAdminExport(exportState: ExportState): Promise<ResultMessage> {
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
  const json = await response.json() as {
    success?: boolean;
    error?: string;
    message?: string;
    download_url?: string;
  };

  if (response.ok && json.success && json.download_url) {
    return {
      type: 'success',
      message: 'Export ready. Click to download.',
      link: json.download_url
    };
  }

  return {
    type: 'error',
    message: json.error || json.message || 'Export failed'
  };
}
