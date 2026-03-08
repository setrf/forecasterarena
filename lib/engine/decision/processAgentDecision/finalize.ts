import { createApiCost, finalizeDecision } from '@/lib/db/queries';
import { estimateCostFromSnapshot } from '@/lib/openrouter/client';
import type { DecisionAttempt } from '@/lib/engine/decision/processAgentDecision/llm';
import type { AgentWithModel } from '@/lib/types';

export function finalizeProcessedDecision(args: {
  agent: AgentWithModel;
  decisionId: string;
  systemPrompt: string;
  userPrompt: string;
  decisionAttempt: DecisionAttempt;
}) {
  const { agent, decisionId, systemPrompt, userPrompt, decisionAttempt } = args;
  const inputPrice = agent.model.input_price_per_million;
  const outputPrice = agent.model.output_price_per_million;

  if (inputPrice === null || outputPrice === null) {
    throw new Error(`Agent ${agent.id} is missing frozen pricing snapshots`);
  }

  const apiCostUsd = estimateCostFromSnapshot(decisionAttempt.response.usage, {
    input: inputPrice,
    output: outputPrice
  });

  const finalizedDecision = finalizeDecision(decisionId, {
    prompt_system: systemPrompt,
    prompt_user: userPrompt,
    raw_response: decisionAttempt.response.content,
    parsed_response: JSON.stringify(decisionAttempt.parsed),
    retry_count: decisionAttempt.retryCount,
    action: decisionAttempt.parsed.action,
    reasoning: decisionAttempt.parsed.reasoning,
    tokens_input: decisionAttempt.response.usage.prompt_tokens,
    tokens_output: decisionAttempt.response.usage.completion_tokens,
    api_cost_usd: apiCostUsd,
    response_time_ms: decisionAttempt.response.response_time_ms,
    error_message: null
  });

  createApiCost({
    model_id: agent.model.legacy_model_id ?? agent.model_id,
    agent_id: agent.id,
    family_id: agent.family_id ?? agent.model.family_id,
    release_id: agent.release_id ?? agent.model.release_id,
    benchmark_config_model_id: agent.benchmark_config_model_id ?? agent.model.config_model?.id ?? null,
    decision_id: finalizedDecision.id,
    tokens_input: finalizedDecision.tokens_input ?? undefined,
    tokens_output: finalizedDecision.tokens_output ?? undefined,
    cost_usd: finalizedDecision.api_cost_usd ?? undefined
  });

  return finalizedDecision;
}
