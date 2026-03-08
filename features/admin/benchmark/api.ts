import type { BenchmarkOverview, BenchmarkResultMessage, ConfigFormState, ReleaseFormState } from '@/features/admin/benchmark/types';

interface ApiErrorPayload {
  error?: string;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => ({})) as ApiErrorPayload;
  return payload.error || fallback;
}

export async function fetchAdminBenchmarkOverview(): Promise<BenchmarkOverview | null> {
  const response = await fetch('/api/admin/benchmark');
  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to load benchmark overview'));
  }

  return response.json() as Promise<BenchmarkOverview>;
}

export async function createAdminBenchmarkRelease(
  releaseState: ReleaseFormState
): Promise<BenchmarkResultMessage> {
  const response = await fetch('/api/admin/benchmark/releases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      family_id: releaseState.familyId,
      release_name: releaseState.releaseName,
      openrouter_id: releaseState.openrouterId,
      default_input_price_per_million: Number(releaseState.inputPricePerMillion),
      default_output_price_per_million: Number(releaseState.outputPricePerMillion),
      notes: releaseState.notes
    })
  });

  if (!response.ok) {
    return {
      type: 'error',
      message: await readErrorMessage(response, 'Release creation failed')
    };
  }

  const payload = await response.json() as { release?: { release_name?: string } };
  return {
    type: 'success',
    message: `${payload.release?.release_name || 'Release'} registered successfully`
  };
}

export async function createAdminBenchmarkConfig(
  configState: ConfigFormState
): Promise<BenchmarkResultMessage> {
  const response = await fetch('/api/admin/benchmark/configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version_name: configState.versionName,
      methodology_version: configState.methodologyVersion,
      notes: configState.notes,
      assignments: configState.assignments.map((assignment) => ({
        family_id: assignment.familyId,
        release_id: assignment.releaseId,
        input_price_per_million: Number(assignment.inputPricePerMillion),
        output_price_per_million: Number(assignment.outputPricePerMillion)
      }))
    })
  });

  if (!response.ok) {
    return {
      type: 'error',
      message: await readErrorMessage(response, 'Benchmark config creation failed')
    };
  }

  const payload = await response.json() as { config?: { version_name?: string } };
  return {
    type: 'success',
    message: `${payload.config?.version_name || 'Benchmark config'} created successfully`
  };
}

export async function promoteAdminBenchmarkConfig(
  configId: string
): Promise<BenchmarkResultMessage> {
  const response = await fetch('/api/admin/benchmark/default', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config_id: configId })
  });

  if (!response.ok) {
    return {
      type: 'error',
      message: await readErrorMessage(response, 'Config promotion failed')
    };
  }

  const payload = await response.json() as { version_name?: string };
  return {
    type: 'success',
    message: `${payload.version_name || 'Benchmark config'} promoted for future cohorts`
  };
}
