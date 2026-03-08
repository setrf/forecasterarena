import {
  getAllBenchmarkConfigs,
  getAllModelFamilies,
  getActiveCohorts,
  getAgentsByCohort,
  getBenchmarkConfigModels,
  getDefaultBenchmarkConfig,
  getModelReleasesByFamily
} from '@/lib/db/queries';
import { getReleasePricingDefaults, parseAdminReleaseMetadata } from '@/lib/application/admin-benchmark/helpers';
import type {
  AdminBenchmarkConfigSummary,
  AdminBenchmarkFamilySummary,
  AdminBenchmarkOverview
} from '@/lib/application/admin-benchmark/types';

export function getAdminBenchmarkOverview(): AdminBenchmarkOverview {
  const families = getAllModelFamilies();
  const defaultConfig = getDefaultBenchmarkConfig();
  const activeCohorts = getActiveCohorts();
  const defaultConfigModels = new Map(
    (defaultConfig ? getBenchmarkConfigModels(defaultConfig.id) : []).map((model) => [model.family_id, model])
  );

  const familySummaries: AdminBenchmarkFamilySummary[] = families.map((family) => {
    const currentConfigModel = defaultConfigModels.get(family.id);
    const releases = getModelReleasesByFamily(family.id).map((release) => {
      const defaults = getReleasePricingDefaults({
        family,
        release,
        currentConfigModel
      });

      return {
        ...release,
        default_input_price_per_million: defaults.input,
        default_output_price_per_million: defaults.output,
        metadata: parseAdminReleaseMetadata(release.metadata_json)
      };
    });

    const currentRelease = releases.find((release) => release.id === currentConfigModel?.release_id) ?? null;

    return {
      ...family,
      current_release_id: currentRelease?.id ?? null,
      current_release_name: currentRelease?.release_name ?? currentConfigModel?.release_display_name_snapshot ?? null,
      current_openrouter_id: currentRelease?.openrouter_id ?? currentConfigModel?.openrouter_id_snapshot ?? null,
      current_input_price_per_million: currentConfigModel?.input_price_per_million_snapshot ?? null,
      current_output_price_per_million: currentConfigModel?.output_price_per_million_snapshot ?? null,
      releases
    };
  });

  const configs: AdminBenchmarkConfigSummary[] = getAllBenchmarkConfigs(12).map((config) => ({
    ...config,
    models: getBenchmarkConfigModels(config.id)
  }));

  return {
    default_config_id: defaultConfig?.id ?? null,
    active_cohort_count: activeCohorts.length,
    active_agent_count: activeCohorts.reduce((sum, cohort) => sum + getAgentsByCohort(cohort.id).length, 0),
    families: familySummaries,
    configs,
    updated_at: new Date().toISOString()
  };
}
