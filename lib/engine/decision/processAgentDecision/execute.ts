import {
  claimDecisionForProcessing,
  finalizeDecision
} from '@/lib/db/queries';
import { LLM_TIMEOUT_MS } from '@/lib/constants';
import { estimateCost } from '@/lib/openrouter/client';
import { buildDecisionUserPrompt } from '@/lib/engine/decision/buildDecisionUserPrompt';
import { executeDecisionTrades } from '@/lib/engine/decision/executeDecisionTrades';
import {
  handleDecisionError,
  handleExecutionFailure
} from '@/lib/engine/decision/processAgentDecision/errors';
import { requestDecisionWithRetries } from '@/lib/engine/decision/processAgentDecision/llm';
import { createDecisionResult } from '@/lib/engine/decision/processAgentDecision/result';
import { SYSTEM_PROMPT } from '@/lib/openrouter/prompts';
import type { AgentDecisionResult } from '@/lib/engine/decision/types';
import type { AgentWithModel, Market } from '@/lib/types';

export async function processAgentDecision(
  agent: AgentWithModel,
  cohortId: string,
  weekNumber: number,
  markets: Market[]
): Promise<AgentDecisionResult> {
  const result = createDecisionResult(agent);

  let claimedDecisionId: string | null = null;
  const systemPrompt = SYSTEM_PROMPT;
  let userPrompt = '';
  let retryCount = 0;
  let rawResponse: string | undefined;

  try {
    if (agent.status === 'bankrupt') {
      return {
        ...result,
        action: 'SKIPPED',
        success: true
      };
    }

    const decisionClaim = claimDecisionForProcessing({
      agent_id: agent.id,
      cohort_id: cohortId,
      decision_week: weekNumber,
      stale_after_ms: LLM_TIMEOUT_MS * 2
    });

    if (decisionClaim.status === 'skipped') {
      return {
        ...result,
        decision_id: decisionClaim.decision.id,
        action: 'SKIPPED',
        success: true
      };
    }

    claimedDecisionId = decisionClaim.decision.id;
    result.decision_id = claimedDecisionId;

    console.log(`Processing decision for ${agent.model.display_name}...`);

    userPrompt = buildDecisionUserPrompt(agent, markets, weekNumber);

    const decisionOutput = await requestDecisionWithRetries({
      agent,
      systemPrompt,
      userPrompt
    });

    rawResponse = decisionOutput.response.content;
    retryCount = decisionOutput.retryCount;

    const decision = finalizeDecision(claimedDecisionId, {
      prompt_system: systemPrompt,
      prompt_user: userPrompt,
      raw_response: decisionOutput.response.content,
      parsed_response: JSON.stringify(decisionOutput.parsed),
      retry_count: retryCount,
      action: decisionOutput.parsed.action,
      reasoning: decisionOutput.parsed.reasoning,
      tokens_input: decisionOutput.response.usage.prompt_tokens,
      tokens_output: decisionOutput.response.usage.completion_tokens,
      api_cost_usd: estimateCost(decisionOutput.response.usage, agent.model.openrouter_id),
      response_time_ms: decisionOutput.response.response_time_ms,
      error_message: null
    });

    result.decision_id = decision.id;
    result.action = decisionOutput.parsed.action;

    const tradeSummary = executeDecisionTrades(agent.id, decisionOutput.parsed, decision.id);
    result.trades_executed = tradeSummary.tradesExecuted;

    if (
      (decisionOutput.parsed.action === 'BET' || decisionOutput.parsed.action === 'SELL') &&
      tradeSummary.attemptedTrades > 0 &&
      tradeSummary.tradesExecuted === 0
    ) {
      return handleExecutionFailure({
        agent,
        decisionId: decision.id,
        action: decisionOutput.parsed.action,
        errors: tradeSummary.executionErrors,
        result
      });
    }

    result.success = true;
    console.log(`${agent.model.display_name}: ${decisionOutput.parsed.action} (${tradeSummary.tradesExecuted} trades)`);
    return result;
  } catch (error) {
    return handleDecisionError({
      agent,
      result,
      claimedDecisionId,
      systemPrompt,
      userPrompt,
      rawResponse,
      retryCount,
      error
    });
  }
}
