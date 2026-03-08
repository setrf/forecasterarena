import { logSystemEvent } from '@/lib/db';
import {
  getActiveModelFamilies,
  getBenchmarkConfigById,
  getBenchmarkConfigModels,
  setDefaultBenchmarkConfig
} from '@/lib/db/queries';
import type { AdminOperationResult } from '@/lib/application/admin/types';

export function promoteAdminBenchmarkConfig(
  configId: string
): AdminOperationResult<{
  success: true;
  config_id: string;
  version_name: string;
}> {
  const config = getBenchmarkConfigById(configId);
  if (!config) {
    return { ok: false, status: 404, error: 'Unknown benchmark config' };
  }

  const configModels = getBenchmarkConfigModels(config.id);
  const activeFamilies = getActiveModelFamilies();
  const configFamilyIds = new Set(configModels.map((model) => model.family_id));
  const missingFamilies = activeFamilies.filter((family) => !configFamilyIds.has(family.id));

  if (missingFamilies.length > 0) {
    return {
      ok: false,
      status: 400,
      error: `Cannot promote an incomplete config. Missing families: ${missingFamilies.map((family) => family.public_display_name).join(', ')}`
    };
  }

  setDefaultBenchmarkConfig(config.id);
  logSystemEvent('admin_benchmark_config_promoted', {
    benchmark_config_id: config.id,
    version_name: config.version_name
  }, 'info');

  return {
    ok: true,
    data: {
      success: true,
      config_id: config.id,
      version_name: config.version_name
    }
  };
}
