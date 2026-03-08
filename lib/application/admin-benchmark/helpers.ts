import { findBootstrapFamilyByFamilyId } from '@/lib/catalog/bootstrap';
import type { BenchmarkConfigModelAssignment } from '@/lib/db/queries/benchmark-configs';
import type { ModelFamily, ModelRelease } from '@/lib/types';
import type { AdminReleaseMetadata } from '@/lib/application/admin-benchmark/types';

export function slugifyReleaseName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'release';
}

export function buildModelReleaseId(familyId: string, releaseSlug: string): string {
  return `${familyId}--${releaseSlug}`;
}

export function parseAdminReleaseMetadata(metadataJson: string | null): AdminReleaseMetadata | null {
  if (!metadataJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadataJson) as AdminReleaseMetadata;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getReleasePricingDefaults(args: {
  family: Pick<ModelFamily, 'id'>;
  release: Pick<ModelRelease, 'id' | 'metadata_json'>;
  currentConfigModel?: Pick<
    BenchmarkConfigModelAssignment,
    | 'release_id'
    | 'input_price_per_million_snapshot'
    | 'output_price_per_million_snapshot'
  >;
}) {
  const metadata = parseAdminReleaseMetadata(args.release.metadata_json);
  const metadataInput = Number.isFinite(metadata?.default_input_price_per_million)
    ? Number(metadata?.default_input_price_per_million)
    : null;
  const metadataOutput = Number.isFinite(metadata?.default_output_price_per_million)
    ? Number(metadata?.default_output_price_per_million)
    : null;

  if (metadataInput !== null && metadataOutput !== null) {
    return {
      input: metadataInput,
      output: metadataOutput
    };
  }

  if (args.currentConfigModel && args.currentConfigModel.release_id === args.release.id) {
    return {
      input: args.currentConfigModel.input_price_per_million_snapshot,
      output: args.currentConfigModel.output_price_per_million_snapshot
    };
  }

  const bootstrap = findBootstrapFamilyByFamilyId(args.family.id);
  if (bootstrap) {
    return {
      input: bootstrap.inputPricePerMillion,
      output: bootstrap.outputPricePerMillion
    };
  }

  return {
    input: 0,
    output: 0
  };
}
