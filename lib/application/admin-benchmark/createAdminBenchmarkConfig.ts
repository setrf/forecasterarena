import { METHODOLOGY_VERSION } from '@/lib/constants';
import { logSystemEvent } from '@/lib/db';
import {
  createBenchmarkConfig,
  createBenchmarkConfigModel,
  getActiveModelFamilies,
  getBenchmarkConfigById,
  getBenchmarkConfigModels,
  getModelFamilyById,
  getModelReleaseById
} from '@/lib/db/queries';
import { withTransaction } from '@/lib/db/transactions';
import type { AdminOperationResult } from '@/lib/application/admin/types';
import {
  getNullableTrimmedString,
  getRequiredTrimmedString,
  isNonNegativeFiniteNumber
} from '@/lib/application/admin-benchmark/validation';
import type {
  AdminBenchmarkConfigSummary,
  CreateAdminBenchmarkConfigInput
} from '@/lib/application/admin-benchmark/types';

export function createAdminBenchmarkConfigRecord(
  input: CreateAdminBenchmarkConfigInput
): AdminOperationResult<{
  success: true;
  config: AdminBenchmarkConfigSummary;
}> {
  const versionName = getRequiredTrimmedString(input.version_name, 'Version name');
  if (!versionName.ok) {
    return { ok: false, status: 400, error: versionName.error };
  }

  const assignments = Array.isArray(input.assignments) ? input.assignments : [];
  if (assignments.length === 0) {
    return { ok: false, status: 400, error: 'At least one lineup assignment is required' };
  }

  const activeFamilies = getActiveModelFamilies();
  const activeFamilyIds = new Set(activeFamilies.map((family) => family.id));
  const seenFamilies = new Set<string>();

  for (const assignment of assignments) {
    const familyId = getRequiredTrimmedString(assignment.family_id, 'Lineup assignment family');
    if (!familyId.ok) {
      return { ok: false, status: 400, error: familyId.error };
    }

    const releaseId = getRequiredTrimmedString(assignment.release_id, 'Lineup assignment release');
    if (!releaseId.ok) {
      return { ok: false, status: 400, error: releaseId.error };
    }

    if (!activeFamilyIds.has(familyId.value)) {
      return { ok: false, status: 400, error: `Unknown or inactive model family: ${familyId.value}` };
    }

    if (seenFamilies.has(familyId.value)) {
      return { ok: false, status: 400, error: `Duplicate lineup assignment for family: ${familyId.value}` };
    }
    seenFamilies.add(familyId.value);

    if (!isNonNegativeFiniteNumber(assignment.input_price_per_million)) {
      return { ok: false, status: 400, error: `Invalid input price for family: ${familyId.value}` };
    }

    if (!isNonNegativeFiniteNumber(assignment.output_price_per_million)) {
      return { ok: false, status: 400, error: `Invalid output price for family: ${familyId.value}` };
    }

    const family = getModelFamilyById(familyId.value);
    const release = getModelReleaseById(releaseId.value);
    if (!family || !release || release.family_id !== family.id) {
      return { ok: false, status: 400, error: `Release ${releaseId.value} does not belong to family ${familyId.value}` };
    }

    if (release.release_status === 'retired') {
      return { ok: false, status: 400, error: `Release ${release.release_name} is retired and cannot be used in a new config` };
    }
  }

  const missingFamilies = activeFamilies.filter((family) => !seenFamilies.has(family.id));
  if (missingFamilies.length > 0) {
    return {
      ok: false,
      status: 400,
      error: `Missing lineup assignments for active families: ${missingFamilies.map((family) => family.public_display_name).join(', ')}`
    };
  }

  const methodologyVersion = getNullableTrimmedString(input.methodology_version) || METHODOLOGY_VERSION;
  const notes = getNullableTrimmedString(input.notes);

  const config = withTransaction(() => {
    const createdConfig = createBenchmarkConfig({
      version_name: versionName.value,
      methodology_version: methodologyVersion,
      notes,
      created_by: 'admin',
      is_default_for_future_cohorts: false
    });

    activeFamilies
      .sort((left, right) => left.sort_order - right.sort_order)
      .forEach((family, index) => {
        const assignment = assignments.find((item) => item.family_id === family.id)!;
        const release = getModelReleaseById(assignment.release_id)!;

        createBenchmarkConfigModel({
          benchmark_config_id: createdConfig.id,
          family_id: family.id,
          release_id: release.id,
          slot_order: index,
          family_display_name_snapshot: family.public_display_name,
          short_display_name_snapshot: family.short_display_name,
          release_display_name_snapshot: release.release_name,
          provider_snapshot: release.provider,
          color_snapshot: family.color,
          openrouter_id_snapshot: release.openrouter_id,
          input_price_per_million_snapshot: assignment.input_price_per_million,
          output_price_per_million_snapshot: assignment.output_price_per_million
        });
      });

    return createdConfig;
  });

  logSystemEvent('admin_benchmark_config_created', {
    benchmark_config_id: config.id,
    version_name: config.version_name,
    family_count: activeFamilies.length
  }, 'info');

  return {
    ok: true,
    data: {
      success: true,
      config: {
        ...getBenchmarkConfigById(config.id)!,
        models: getBenchmarkConfigModels(config.id)
      }
    }
  };
}
