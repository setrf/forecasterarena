import { METHODOLOGY_VERSION } from '@/lib/constants';
import type {
  BenchmarkOverview,
  ConfigAssignmentState,
  ConfigFormState,
  ReleaseFormState
} from '@/features/admin/benchmark/types';

export function buildReleaseFormState(overview: BenchmarkOverview | null): ReleaseFormState {
  const firstFamily = overview?.families[0];

  return {
    familyId: firstFamily?.id ?? '',
    releaseName: '',
    openrouterId: '',
    inputPricePerMillion: firstFamily?.current_input_price_per_million?.toString() ?? '0',
    outputPricePerMillion: firstFamily?.current_output_price_per_million?.toString() ?? '0',
    notes: ''
  };
}

function buildConfigAssignment(overview: BenchmarkOverview, familyId: string): ConfigAssignmentState {
  const family = overview.families.find((item) => item.id === familyId);
  const fallbackRelease = family?.releases[0];

  return {
    familyId,
    releaseId: family?.current_release_id ?? fallbackRelease?.id ?? '',
    inputPricePerMillion: String(
      family?.current_input_price_per_million
        ?? fallbackRelease?.default_input_price_per_million
        ?? 0
    ),
    outputPricePerMillion: String(
      family?.current_output_price_per_million
        ?? fallbackRelease?.default_output_price_per_million
        ?? 0
    )
  };
}

export function buildConfigFormState(
  overview: BenchmarkOverview,
  previous?: ConfigFormState | null
): ConfigFormState {
  const assignments = overview.families.map((family) => {
    const previousAssignment = previous?.assignments.find((assignment) => assignment.familyId === family.id);
    const allowedReleaseIds = new Set(family.releases.map((release) => release.id));

    if (previousAssignment && allowedReleaseIds.has(previousAssignment.releaseId)) {
      return previousAssignment;
    }

    return buildConfigAssignment(overview, family.id);
  });

  return {
    versionName: previous?.versionName ?? '',
    methodologyVersion: previous?.methodologyVersion ?? METHODOLOGY_VERSION,
    notes: previous?.notes ?? '',
    assignments
  };
}
