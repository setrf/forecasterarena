import { finalizeDecision } from '@/lib/db/queries';
import { estimateCost } from '@/lib/openrouter/client';
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

  return finalizeDecision(decisionId, {
    prompt_system: systemPrompt,
    prompt_user: userPrompt,
    raw_response: decisionAttempt.response.content,
    parsed_response: JSON.stringify(decisionAttempt.parsed),
    retry_count: decisionAttempt.retryCount,
    action: decisionAttempt.parsed.action,
    reasoning: decisionAttempt.parsed.reasoning,
    tokens_input: decisionAttempt.response.usage.prompt_tokens,
    tokens_output: decisionAttempt.response.usage.completion_tokens,
    api_cost_usd: estimateCost(decisionAttempt.response.usage, agent.model.openrouter_id),
    response_time_ms: decisionAttempt.response.response_time_ms,
    error_message: null
  });
}
