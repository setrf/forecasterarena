import { logSystemEvent } from '@/lib/db';
import {
  createModelRelease,
  getModelFamilyById,
  getModelReleasesByFamily
} from '@/lib/db/queries';
import type { AdminOperationResult } from '@/lib/application/admin/types';
import { buildModelReleaseId, slugifyReleaseName } from '@/lib/application/admin-benchmark/helpers';
import type {
  AdminBenchmarkReleaseSummary,
  CreateAdminModelReleaseInput
} from '@/lib/application/admin-benchmark/types';

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function createAdminModelReleaseRecord(
  input: CreateAdminModelReleaseInput
): AdminOperationResult<{
  success: true;
  release: AdminBenchmarkReleaseSummary;
}> {
  const family = getModelFamilyById(input.family_id);
  if (!family) {
    return { ok: false, status: 404, error: 'Unknown model family' };
  }

  const releaseName = input.release_name.trim();
  const openrouterId = input.openrouter_id.trim();

  if (!releaseName) {
    return { ok: false, status: 400, error: 'Release name is required' };
  }

  if (!openrouterId) {
    return { ok: false, status: 400, error: 'OpenRouter model ID is required' };
  }

  if (!isNonNegativeFiniteNumber(input.default_input_price_per_million)) {
    return { ok: false, status: 400, error: 'Input price must be a non-negative number' };
  }

  if (!isNonNegativeFiniteNumber(input.default_output_price_per_million)) {
    return { ok: false, status: 400, error: 'Output price must be a non-negative number' };
  }

  const releaseSlug = slugifyReleaseName(input.release_slug?.trim() || releaseName);
  const existingRelease = getModelReleasesByFamily(family.id).find((release) => (
    release.release_slug === releaseSlug || release.openrouter_id === openrouterId
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

  const metadata = JSON.stringify({
    notes: input.notes?.trim() || undefined,
    default_input_price_per_million: input.default_input_price_per_million,
    default_output_price_per_million: input.default_output_price_per_million,
    created_via: 'admin'
  });

  const release = createModelRelease({
    id: buildModelReleaseId(family.id, releaseSlug),
    family_id: family.id,
    release_name: releaseName,
    release_slug: releaseSlug,
    openrouter_id: openrouterId,
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
          notes: input.notes?.trim() || undefined,
          default_input_price_per_million: input.default_input_price_per_million,
          default_output_price_per_million: input.default_output_price_per_million,
          created_via: 'admin'
        }
      }
    }
  };
}
