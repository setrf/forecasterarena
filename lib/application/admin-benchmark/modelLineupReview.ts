import { METHODOLOGY_VERSION } from '@/lib/constants';
import { logSystemEvent, withTransaction } from '@/lib/db';
import {
  approveModelLineupReview,
  createBenchmarkConfig,
  createBenchmarkConfigModel,
  createModelLineupReview,
  createModelRelease,
  dismissModelLineupReview,
  getActiveModelFamilies,
  getBenchmarkConfigById,
  getBenchmarkConfigModels,
  getDefaultBenchmarkConfig,
  getLatestModelLineupReview,
  getModelLineupReviewById,
  getModelReleaseById,
  getModelReleasesByFamily,
  setDefaultBenchmarkConfig,
  type ModelLineupReviewRecord
} from '@/lib/db/queries';
import type { AdminOperationResult } from '@/lib/application/admin/types';
import {
  buildModelReleaseId,
  parseAdminReleaseMetadata,
  slugifyReleaseName
} from '@/lib/application/admin-benchmark/helpers';
import type {
  AdminModelLineupReviewSummary,
  ModelLineupReviewCandidate,
  ModelLineupReviewDecision
} from '@/lib/application/admin-benchmark/types';

interface OpenRouterCatalogModel {
  id?: unknown;
  name?: unknown;
  pricing?: {
    prompt?: unknown;
    completion?: unknown;
  };
  architecture?: unknown;
  [key: string]: unknown;
}

interface FamilyRule {
  providerPrefixes: string[];
  requiredFragments: string[];
  avoidFragments?: string[];
}

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const EXCLUDED_FRAGMENTS = [
  'audio', 'coder', 'codex', 'coding', 'computer-use', 'custom-tools', 'embed', 'embedding',
  'free', 'image', 'moderation', 'rerank', 'speech', 'transcription', 'tts', 'whisper'
];

const FAMILY_RULES: Record<string, FamilyRule> = {
  'openai-gpt': {
    providerPrefixes: ['openai/'],
    requiredFragments: ['gpt'],
    avoidFragments: ['mini', 'nano', 'oss']
  },
  'google-gemini': {
    providerPrefixes: ['google/'],
    requiredFragments: ['gemini'],
    avoidFragments: ['flash']
  },
  'xai-grok': {
    providerPrefixes: ['x-ai/'],
    requiredFragments: ['grok'],
    avoidFragments: ['fast', 'mini']
  },
  'anthropic-claude-opus': {
    providerPrefixes: ['anthropic/'],
    requiredFragments: ['claude', 'opus']
  },
  'deepseek-v3': {
    providerPrefixes: ['deepseek/'],
    requiredFragments: ['deepseek'],
    avoidFragments: ['chat', 'lite']
  },
  'moonshot-kimi': {
    providerPrefixes: ['moonshotai/'],
    requiredFragments: ['kimi']
  },
  'alibaba-qwen': {
    providerPrefixes: ['qwen/'],
    requiredFragments: ['qwen', 'max'],
    avoidFragments: ['coder', 'plus', 'thinking']
  }
};

function lowerText(...parts: Array<unknown>): string {
  return parts
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .toLowerCase();
}

function modelSearchText(model: OpenRouterCatalogModel): string {
  return lowerText(
    model.id,
    model.name,
    typeof model.architecture === 'string' ? model.architecture : JSON.stringify(model.architecture ?? '')
  );
}

function isExcludedVariant(model: OpenRouterCatalogModel, rule: FamilyRule): string | null {
  const text = modelSearchText(model);
  const fragments = [...EXCLUDED_FRAGMENTS, ...(rule.avoidFragments ?? [])];
  const matched = fragments.find((fragment) => text.includes(fragment));
  return matched ? `Excluded specialized variant containing "${matched}"` : null;
}

function matchesFamily(model: OpenRouterCatalogModel, rule: FamilyRule): boolean {
  if (typeof model.id !== 'string') {
    return false;
  }

  const id = model.id.toLowerCase();
  const text = modelSearchText(model);
  return rule.providerPrefixes.some((prefix) => id.startsWith(prefix)) &&
    rule.requiredFragments.every((fragment) => text.includes(fragment));
}

function versionParts(text: string): number[] {
  const normalized = text
    .replace(/\b20\d{2}[-_/]\d{1,2}[-_/]\d{1,2}\b/g, ' ')
    .replace(/[-_/](?:0?[1-9]|1[0-2])(?:[0-3]\d)\b/g, ' ');
  const numbers = Array.from(normalized.matchAll(/\d+(?:\.\d+)?/g))
    .filter((match) => match[0].replace('.', '').length <= 2)
    .map((match) => Number(match[0]))
    .filter((value) => Number.isFinite(value) && value < 2000);

  return numbers.flatMap((value) => String(value).split('.').map((part) => Number(part)));
}

function compareVersions(left: number[], right: number[]): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }
  return 0;
}

function parsePricePerMillion(value: unknown): number | null {
  const numeric = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  const perMillion = numeric > 0.01 ? numeric : numeric * 1_000_000;
  return Number(perMillion.toFixed(6));
}

function releaseNameFromModel(model: OpenRouterCatalogModel): string {
  if (typeof model.name === 'string' && model.name.trim()) {
    return model.name.trim();
  }

  if (typeof model.id === 'string') {
    const lastSegment = model.id.split('/').pop() ?? model.id;
    return lastSegment
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return 'Unknown Release';
}

function candidateCount(candidates: ModelLineupReviewCandidate[]): number {
  return candidates.filter((candidate) => candidate.decision !== 'unchanged').length;
}

function statusForCandidates(candidates: ModelLineupReviewCandidate[]) {
  return candidateCount(candidates) > 0 ? 'open' as const : 'no_changes' as const;
}

function serializeCandidates(candidates: ModelLineupReviewCandidate[]): string {
  return JSON.stringify(candidates);
}

function parseCandidates(value: string): ModelLineupReviewCandidate[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed as ModelLineupReviewCandidate[] : [];
  } catch {
    return [];
  }
}

function summarizeCatalog(models: OpenRouterCatalogModel[], extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    source: OPENROUTER_MODELS_URL,
    total_models: models.length,
    ...extra
  });
}

function reviewSummary(record: ModelLineupReviewRecord | undefined): AdminModelLineupReviewSummary | null {
  if (!record) {
    return null;
  }

  const candidates = parseCandidates(record.candidate_lineup_json);
  return {
    id: record.id,
    status: record.status,
    checked_at: record.checked_at,
    reviewed_at: record.reviewed_at,
    candidate_count: candidateCount(candidates),
    target_config_id: record.target_config_id,
    error_message: record.error_message,
    candidates
  };
}

export function getLatestModelLineupReviewSummary(): AdminModelLineupReviewSummary | null {
  return reviewSummary(getLatestModelLineupReview());
}

export async function fetchOpenRouterModelCatalog(
  fetchImpl: typeof fetch = fetch
): Promise<OpenRouterCatalogModel[]> {
  const response = await fetchImpl(OPENROUTER_MODELS_URL);
  if (!response.ok) {
    throw new Error(`OpenRouter model catalog request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as { data?: unknown };
  if (!Array.isArray(payload.data)) {
    throw new Error('OpenRouter model catalog response did not include a data array');
  }

  return payload.data as OpenRouterCatalogModel[];
}

export function buildModelLineupReviewCandidates(
  catalogModels: OpenRouterCatalogModel[]
): ModelLineupReviewCandidate[] {
  const defaultConfig = getDefaultBenchmarkConfig();
  const currentModels = new Map(
    (defaultConfig ? getBenchmarkConfigModels(defaultConfig.id) : []).map((model) => [model.family_id, model])
  );

  return getActiveModelFamilies()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((family) => {
      const current = currentModels.get(family.id);
      const rule = FAMILY_RULES[family.id];

      const base = {
        family_id: family.id,
        family_name: family.public_display_name,
        current_release_id: current?.release_id ?? null,
        current_release_name: current?.release_display_name_snapshot ?? null,
        current_openrouter_id: current?.openrouter_id_snapshot ?? null
      };

      if (!current || !rule) {
        return {
          ...base,
          candidate_openrouter_id: null,
          candidate_name: null,
          input_price_per_million: null,
          output_price_per_million: null,
          decision: 'missing' as ModelLineupReviewDecision,
          reason: !current ? 'No current default release is configured for this family' : 'No discovery rule is configured for this family'
        };
      }

      const currentVersion = versionParts(`${current.openrouter_id_snapshot} ${current.release_display_name_snapshot}`);
      const familyModels = catalogModels
        .filter((model) => matchesFamily(model, rule))
        .filter((model) => !isExcludedVariant(model, rule));

      const newerModels = familyModels.filter((model) => (
        compareVersions(versionParts(`${String(model.id)} ${String(model.name ?? '')}`), currentVersion) > 0
      ));

      if (newerModels.length === 0) {
        return {
          ...base,
          candidate_openrouter_id: null,
          candidate_name: null,
          input_price_per_million: null,
          output_price_per_million: null,
          decision: 'unchanged' as ModelLineupReviewDecision,
          reason: 'No newer general-purpose OpenRouter release matched the family rules'
        };
      }

      const ranked = newerModels
        .map((model) => ({
          model,
          version: versionParts(`${String(model.id)} ${String(model.name ?? '')}`)
        }))
        .sort((left, right) => compareVersions(right.version, left.version));
      const topVersion = ranked[0]!.version;
      const topMatches = ranked.filter((entry) => compareVersions(entry.version, topVersion) === 0);
      const selected = topMatches[0]!.model;
      const inputPrice = parsePricePerMillion(selected.pricing?.prompt);
      const outputPrice = parsePricePerMillion(selected.pricing?.completion);
      const candidateName = releaseNameFromModel(selected);
      const candidateOpenRouterId = typeof selected.id === 'string' ? selected.id : null;

      if (topMatches.length > 1) {
        return {
          ...base,
          candidate_openrouter_id: candidateOpenRouterId,
          candidate_name: candidateName,
          input_price_per_million: inputPrice,
          output_price_per_million: outputPrice,
          decision: 'needs_review' as ModelLineupReviewDecision,
          reason: `Multiple newer candidates share the top version: ${topMatches.map((entry) => entry.model.id).join(', ')}`
        };
      }

      if (!candidateOpenRouterId || inputPrice === null || outputPrice === null) {
        return {
          ...base,
          candidate_openrouter_id: candidateOpenRouterId,
          candidate_name: candidateName,
          input_price_per_million: inputPrice,
          output_price_per_million: outputPrice,
          decision: 'needs_review' as ModelLineupReviewDecision,
          reason: 'Candidate matched, but pricing or model ID was missing from the OpenRouter catalog'
        };
      }

      return {
        ...base,
        candidate_openrouter_id: candidateOpenRouterId,
        candidate_name: candidateName,
        input_price_per_million: inputPrice,
        output_price_per_million: outputPrice,
        decision: 'upgrade' as ModelLineupReviewDecision,
        reason: 'Newer general-purpose OpenRouter release matched the family rules'
      };
    });
}

export async function checkModelLineupReview(
  fetchImpl: typeof fetch = fetch
): Promise<AdminModelLineupReviewSummary> {
  try {
    const catalog = await fetchOpenRouterModelCatalog(fetchImpl);
    const candidates = buildModelLineupReviewCandidates(catalog);
    const record = createModelLineupReview({
      status: statusForCandidates(candidates),
      candidate_lineup_json: serializeCandidates(candidates),
      catalog_summary_json: summarizeCatalog(catalog, {
        candidate_count: candidateCount(candidates)
      })
    });

    logSystemEvent('admin_model_lineup_review_checked', {
      review_id: record.id,
      status: record.status,
      candidate_count: candidateCount(candidates)
    }, record.status === 'no_changes' ? 'info' : 'warning');

    return reviewSummary(record)!;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const record = createModelLineupReview({
      status: 'failed',
      candidate_lineup_json: '[]',
      catalog_summary_json: summarizeCatalog([], { failed: true }),
      error_message: message
    });

    logSystemEvent('admin_model_lineup_review_failed', {
      review_id: record.id,
      error: message
    }, 'error');

    return reviewSummary(record)!;
  }
}

function getOrCreateReviewRelease(candidate: ModelLineupReviewCandidate, sourceReviewId: string) {
  const existing = getModelReleasesByFamily(candidate.family_id).find((release) => (
    release.openrouter_id === candidate.candidate_openrouter_id
  ));
  if (existing) {
    return existing;
  }

  const releaseName = candidate.candidate_name ?? candidate.candidate_openrouter_id ?? 'OpenRouter Candidate';
  const releaseSlug = slugifyReleaseName(releaseName);
  const releaseId = buildModelReleaseId(candidate.family_id, releaseSlug);
  const byId = getModelReleaseById(releaseId);
  if (byId) {
    return byId;
  }

  const family = getActiveModelFamilies().find((item) => item.id === candidate.family_id);
  if (!family || !candidate.candidate_openrouter_id) {
    throw new Error(`Cannot create release for family ${candidate.family_id}`);
  }

  return createModelRelease({
    id: releaseId,
    family_id: family.id,
    release_name: releaseName,
    release_slug: releaseSlug,
    openrouter_id: candidate.candidate_openrouter_id,
    provider: family.provider,
    metadata_json: JSON.stringify({
      default_input_price_per_million: candidate.input_price_per_million,
      default_output_price_per_million: candidate.output_price_per_million,
      created_via: 'lineup_review',
      source_review_id: sourceReviewId,
      notes: 'Detected through the OpenRouter lineup review flow.'
    }),
    release_status: 'active'
  });
}

export function approveModelLineupReviewRecord(reviewId: string): AdminOperationResult<{
  success: true;
  review: AdminModelLineupReviewSummary;
  config_id: string;
  version_name: string;
}> {
  const record = getModelLineupReviewById(reviewId);
  if (!record) {
    return { ok: false, status: 404, error: 'Unknown lineup review' };
  }
  if (record.status !== 'open') {
    return { ok: false, status: 400, error: `Lineup review is ${record.status} and cannot be approved` };
  }

  const candidates = parseCandidates(record.candidate_lineup_json);
  const selectedUpgradeCount = candidates.filter((candidate) => candidate.decision === 'upgrade').length;
  if (selectedUpgradeCount === 0) {
    return { ok: false, status: 400, error: 'No selected upgrade candidates are available to approve' };
  }

  const activeFamilies = getActiveModelFamilies().sort((left, right) => left.sort_order - right.sort_order);
  const candidatesByFamily = new Map(candidates.map((candidate) => [candidate.family_id, candidate]));
  const datePart = record.checked_at.slice(0, 10).replace(/-/g, '');
  const versionName = `lineup-${datePart}-openrouter-review-${record.id.slice(0, 8)}`;

  const config = withTransaction(() => {
    const createdConfig = createBenchmarkConfig({
      version_name: versionName,
      methodology_version: METHODOLOGY_VERSION,
      notes: 'Operator-approved OpenRouter lineup review. Existing active cohorts remain frozen.',
      created_by: 'admin:lineup-review',
      is_default_for_future_cohorts: false
    });

    activeFamilies.forEach((family, index) => {
      const candidate = candidatesByFamily.get(family.id);
      const currentConfig = getDefaultBenchmarkConfig();
      const currentModel = currentConfig
        ? getBenchmarkConfigModels(currentConfig.id).find((model) => model.family_id === family.id)
        : null;
      const release = candidate?.decision === 'upgrade'
        ? getOrCreateReviewRelease(candidate, record.id)
        : getModelReleaseById(candidate?.current_release_id ?? currentModel?.release_id ?? '');

      if (!release) {
        throw new Error(`No release available for family ${family.public_display_name}`);
      }

      const metadata = parseAdminReleaseMetadata(release.metadata_json);
      const inputPrice = candidate?.decision === 'upgrade'
        ? candidate.input_price_per_million
        : currentModel?.input_price_per_million_snapshot ?? metadata?.default_input_price_per_million ?? 0;
      const outputPrice = candidate?.decision === 'upgrade'
        ? candidate.output_price_per_million
        : currentModel?.output_price_per_million_snapshot ?? metadata?.default_output_price_per_million ?? 0;

      if (inputPrice === null || outputPrice === null) {
        throw new Error(`Missing pricing for family ${family.public_display_name}`);
      }

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
        input_price_per_million_snapshot: inputPrice,
        output_price_per_million_snapshot: outputPrice
      });
    });

    setDefaultBenchmarkConfig(createdConfig.id);
    approveModelLineupReview(record.id, createdConfig.id);
    return createdConfig;
  });

  logSystemEvent('admin_model_lineup_review_approved', {
    review_id: record.id,
    benchmark_config_id: config.id,
    version_name: config.version_name,
    selected_upgrade_count: selectedUpgradeCount
  }, 'info');

  return {
    ok: true,
    data: {
      success: true,
      review: getLatestModelLineupReviewSummary()!,
      config_id: config.id,
      version_name: config.version_name
    }
  };
}

export function dismissModelLineupReviewRecord(reviewId: string): AdminOperationResult<{
  success: true;
  review: AdminModelLineupReviewSummary;
}> {
  const record = getModelLineupReviewById(reviewId);
  if (!record) {
    return { ok: false, status: 404, error: 'Unknown lineup review' };
  }
  if (record.status !== 'open' && record.status !== 'no_changes' && record.status !== 'failed') {
    return { ok: false, status: 400, error: `Lineup review is ${record.status} and cannot be dismissed` };
  }

  dismissModelLineupReview(record.id);
  logSystemEvent('admin_model_lineup_review_dismissed', {
    review_id: record.id,
    prior_status: record.status
  }, 'info');

  return {
    ok: true,
    data: {
      success: true,
      review: reviewSummary(getModelLineupReviewById(record.id))!
    }
  };
}
