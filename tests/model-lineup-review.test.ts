import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

function catalogModel(id: string, name: string, input = 0.000006, output = 0.000018) {
  return {
    id,
    name,
    pricing: {
      prompt: String(input),
      completion: String(output)
    }
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock('@/lib/db');
  vi.resetModules();
});

describe('OpenRouter model lineup reviews', () => {
  it('selects newer general-purpose candidates and excludes specialized variants', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const { buildModelLineupReviewCandidates } = await import('@/lib/application/admin-benchmark/modelLineupReview');
      const candidates = buildModelLineupReviewCandidates([
        catalogModel('openai/gpt-5.6-image', 'GPT-5.6 Image'),
        catalogModel('openai/gpt-5.6-codex', 'GPT-5.6 Codex'),
        catalogModel('openai/gpt-5.6', 'GPT-5.6'),
        catalogModel('google/gemini-3.2-flash', 'Gemini 3.2 Flash'),
        catalogModel('google/gemini-3.2-pro-preview', 'Gemini 3.2 Pro Preview')
      ]);

      expect(candidates.find((candidate) => candidate.family_id === 'openai-gpt')).toMatchObject({
        decision: 'upgrade',
        candidate_openrouter_id: 'openai/gpt-5.6',
        input_price_per_million: 6,
        output_price_per_million: 18
      });
      expect(candidates.find((candidate) => candidate.family_id === 'google-gemini')).toMatchObject({
        decision: 'upgrade',
        candidate_openrouter_id: 'google/gemini-3.2-pro-preview'
      });
      expect(candidates.find((candidate) => candidate.family_id === 'xai-grok')).toMatchObject({
        decision: 'unchanged'
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('marks ambiguous or missing-price candidates as needing review instead of selecting them', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const { buildModelLineupReviewCandidates } = await import('@/lib/application/admin-benchmark/modelLineupReview');
      const ambiguous = buildModelLineupReviewCandidates([
        catalogModel('openai/gpt-5.6', 'GPT-5.6'),
        catalogModel('openai/gpt-5.6-preview', 'GPT-5.6 Preview')
      ]);
      const missingPrice = buildModelLineupReviewCandidates([
        { id: 'openai/gpt-5.7', name: 'GPT-5.7', pricing: {} }
      ]);

      expect(ambiguous.find((candidate) => candidate.family_id === 'openai-gpt')).toMatchObject({
        decision: 'needs_review',
        candidate_openrouter_id: 'openai/gpt-5.6'
      });
      expect(missingPrice.find((candidate) => candidate.family_id === 'openai-gpt')).toMatchObject({
        decision: 'needs_review',
        candidate_openrouter_id: 'openai/gpt-5.7',
        input_price_per_million: null,
        output_price_per_million: null
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('ignores lower-tier side branches, thinking variants, and date-stamped aliases', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const { buildModelLineupReviewCandidates } = await import('@/lib/application/admin-benchmark/modelLineupReview');
      const candidates = buildModelLineupReviewCandidates([
        catalogModel('openai/gpt-oss-120b', 'gpt-oss-120b'),
        catalogModel('moonshotai/kimi-k2-0905', 'Kimi K2 0905'),
        catalogModel('qwen/qwen-plus-2026-02-15:thinking', 'Qwen Plus 2026-02-15 Thinking'),
        catalogModel('qwen/qwen3.7-max-preview', 'Qwen 3.7 Max Preview')
      ]);

      expect(candidates.find((candidate) => candidate.family_id === 'openai-gpt')).toMatchObject({
        decision: 'unchanged'
      });
      expect(candidates.find((candidate) => candidate.family_id === 'moonshot-kimi')).toMatchObject({
        decision: 'unchanged'
      });
      expect(candidates.find((candidate) => candidate.family_id === 'alibaba-qwen')).toMatchObject({
        decision: 'upgrade',
        candidate_openrouter_id: 'qwen/qwen3.7-max-preview'
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('records failed reviews when the OpenRouter catalog cannot be read', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const { checkModelLineupReview } = await import('@/lib/application/admin-benchmark/modelLineupReview');
      const failed = await checkModelLineupReview(vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Unavailable'
      }) as never);

      expect(failed).toMatchObject({
        status: 'failed',
        candidate_count: 0,
        error_message: expect.stringContaining('503')
      });
    } finally {
      await ctx.cleanup();
    }
  });

  it('approves selected upgrades for future cohorts without rolling existing active cohorts', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-03T00:05:00.000Z'));

      const queries = await import('@/lib/db/queries');
      const { startNewCohort } = await import('@/lib/engine/cohort');
      const {
        approveModelLineupReviewRecord,
        checkModelLineupReview
      } = await import('@/lib/application/admin-benchmark/modelLineupReview');

      const firstStart = startNewCohort();
      expect(firstStart.success).toBe(true);
      if (!firstStart.success) {
        return;
      }

      const existingAgents = queries.getAgentsWithModelsByCohort(firstStart.cohort!.id);
      const existingOpenAiAgent = existingAgents.find((agent) => agent.family_id === 'openai-gpt')!;
      const existingReleaseId = existingOpenAiAgent.release_id;
      const existingConfigId = firstStart.cohort!.benchmark_config_id;

      const review = await checkModelLineupReview(vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            catalogModel('openai/gpt-5.6', 'GPT-5.6', 0.000006, 0.000018)
          ]
        })
      }) as never);
      expect(review.status).toBe('open');

      const approved = approveModelLineupReviewRecord(review.id);
      expect(approved.ok).toBe(true);
      if (!approved.ok) {
        return;
      }

      const reloadedFirstCohort = queries.getCohortById(firstStart.cohort!.id)!;
      const reloadedExistingAgent = queries.getAgentsWithModelsByCohort(firstStart.cohort!.id)
        .find((agent) => agent.family_id === 'openai-gpt')!;
      expect(reloadedFirstCohort.benchmark_config_id).toBe(existingConfigId);
      expect(reloadedExistingAgent.release_id).toBe(existingReleaseId);

      vi.setSystemTime(new Date('2026-05-10T00:05:00.000Z'));
      const secondStart = startNewCohort();
      expect(secondStart.success).toBe(true);
      if (!secondStart.success) {
        return;
      }

      const futureOpenAiAgent = queries.getAgentsWithModelsByCohort(secondStart.cohort!.id)
        .find((agent) => agent.family_id === 'openai-gpt')!;
      expect(queries.getDefaultBenchmarkConfig()?.id).toBe(approved.data.config_id);
      expect(futureOpenAiAgent.release_id).not.toBe(existingReleaseId);
      expect(futureOpenAiAgent.model.openrouter_id).toBe('openai/gpt-5.6');
      expect(futureOpenAiAgent.model.input_price_per_million).toBe(6);
      expect(futureOpenAiAgent.model.output_price_per_million).toBe(18);
    } finally {
      await ctx.cleanup();
    }
  });
});
