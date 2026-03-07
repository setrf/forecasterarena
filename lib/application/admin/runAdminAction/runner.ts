import { logSystemEvent } from '@/lib/db';
import type { AdminActionResult } from '@/lib/application/admin/types';
import { executeAdminAction } from '@/lib/application/admin/runAdminAction/execute';

export async function runAdminAction(
  action: string,
  force: boolean
): Promise<AdminActionResult> {
  try {
    return await executeAdminAction(action, force);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logSystemEvent('admin_action_error', { error: message }, 'error');
    return { ok: false, status: 500, error: message };
  }
}
