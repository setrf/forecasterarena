import { logSystemEvent } from '@/lib/db';
import {
  createModelRelease,
  getModelFamilyById,
  getModelReleasesByFamily
} from '@/lib/db/queries';
import type { AdminOperationResult } from '@/lib/application/admin/types';
import { buildModelReleaseId, slugifyReleaseName } from '@/lib/application/admin-benchmark/helpers';
import {
  getOptionalTrimmedString,
  getRequiredTrimmedString,
  isNonNegativeFiniteNumber
} from '@/lib/application/admin-benchmark/validation';
import type {
  AdminBenchmarkReleaseSummary,
  CreateAdminModelReleaseInput
} from '@/lib/application/admin-benchmark/types';

export function createAdminModelReleaseRecord(
  input: CreateAdminModelReleaseInput
): AdminOperationResult<{
  success: true;
  release: AdminBenchmarkReleaseSummary;
}> {
  const familyId = getRequiredTrimmedString(input.family_id, 'Model family');
  if (!familyId.ok) {
    return { ok: false, status: 400, error: familyId.error };
  }

  const family = getModelFamilyById(familyId.value);
  if (!family) {
    return { ok: false, status: 404, error: 'Unknown model family' };
  }

  const releaseName = getRequiredTrimmedString(input.release_name, 'Release name');
  if (!releaseName.ok) {
    return { ok: false, status: 400, error: releaseName.error };
  }

  const openrouterId = getRequiredTrimmedString(input.openrouter_id, 'OpenRouter model ID');
  if (!openrouterId.ok) {
    return { ok: false, status: 400, error: openrouterId.error };
  }

  if (!isNonNegativeFiniteNumber(input.default_input_price_per_million)) {
    return { ok: false, status: 400, error: 'Input price must be a non-negative number' };
  }

  if (!isNonNegativeFiniteNumber(input.default_output_price_per_million)) {
    return { ok: false, status: 400, error: 'Output price must be a non-negative number' };
  }

  const releaseSlug = slugifyReleaseName(getOptionalTrimmedString(input.release_slug) || releaseName.value);
  const existingRelease = getModelReleasesByFamily(family.id).find((release) => (
    release.release_slug === releaseSlug || release.openrouter_id === openrouterId.value
  ));

  if (existingRelease) {
    return {
      ok: false,
      status: 409,
      error: existingRelease.release_slug === releaseSlug
        ? 'A release with that slug already exists for this family'
        : 'A release with that OpenRouter ID already exists for this family'
    };
  }

  const notes = getOptionalTrimmedString(input.notes);
  const metadata = JSON.stringify({
    notes,
    default_input_price_per_million: input.default_input_price_per_million,
    default_output_price_per_million: input.default_output_price_per_million,
    created_via: 'admin'
  });

  const release = createModelRelease({
    id: buildModelReleaseId(family.id, releaseSlug),
    family_id: family.id,
    release_name: releaseName.value,
    release_slug: releaseSlug,
    openrouter_id: openrouterId.value,
    provider: family.provider,
    metadata_json: metadata,
    release_status: 'active'
  });

  logSystemEvent('admin_benchmark_release_created', {
    family_id: family.id,
    release_id: release.id,
    release_name: release.release_name,
    openrouter_id: release.openrouter_id
  }, 'info');

  return {
    ok: true,
    data: {
      success: true,
      release: {
        ...release,
        default_input_price_per_million: input.default_input_price_per_million,
        default_output_price_per_million: input.default_output_price_per_million,
        metadata: {
          notes,
          default_input_price_per_million: input.default_input_price_per_million,
          default_output_price_per_million: input.default_output_price_per_million,
          created_via: 'admin'
        }
      }
    }
  };
}
