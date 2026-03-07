import { logSystemEvent } from '@/lib/db';
import {
  claimDecisionForProcessing,
  finalizeDecision,
  markDecisionAsError
} from '@/lib/db/queries';
import { LLM_MAX_RETRIES, LLM_TIMEOUT_MS } from '@/lib/constants';
import { buildDecisionUserPrompt } from '@/lib/engine/decision/buildDecisionUserPrompt';
import { executeDecisionTrades } from '@/lib/engine/decision/executeDecisionTrades';
import { SYSTEM_PROMPT, buildRetryPrompt } from '@/lib/openrouter/prompts';
import { callOpenRouterWithRetry, estimateCost } from '@/lib/openrouter/client';
import { getDefaultHoldDecision, isValidDecision, parseDecision } from '@/lib/openrouter/parser';
import type { AgentWithModel, Market } from '@/lib/types';
import type { AgentDecisionResult } from '@/lib/engine/decision/types';

export async function processAgentDecision(
  agent: AgentWithModel,
  cohortId: string,
  weekNumber: number,
  markets: Market[]
): Promise<AgentDecisionResult> {
  const result: AgentDecisionResult = {
    agent_id: agent.id,
    model_id: agent.model_id,
    decision_id: '',
    action: 'ERROR',
    success: false
  };

  let claimedDecisionId: string | null = null;
  let systemPrompt = SYSTEM_PROMPT;
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

    let response = await callOpenRouterWithRetry(
      agent.model.openrouter_id,
      systemPrompt,
      userPrompt
    );
    rawResponse = response.content;

    let parsed = parseDecision(response.content, agent.cash_balance);

    while (!isValidDecision(parsed) && retryCount < LLM_MAX_RETRIES) {
      console.log(`Retrying ${agent.model.display_name} due to invalid response...`);

      const retryPrompt = buildRetryPrompt(
        userPrompt,
        response.content,
        parsed.error || 'Unknown error'
      );

      response = await callOpenRouterWithRetry(
        agent.model.openrouter_id,
        systemPrompt,
        retryPrompt
      );

      rawResponse = response.content;
      parsed = parseDecision(response.content, agent.cash_balance);
      retryCount += 1;
    }

    if (!isValidDecision(parsed)) {
      console.log(`${agent.model.display_name} failed to produce valid response, defaulting to HOLD`);
      parsed = getDefaultHoldDecision(`Failed after ${retryCount} retries: ${parsed.error}`);
    }

    const decision = finalizeDecision(claimedDecisionId, {
      prompt_system: systemPrompt,
      prompt_user: userPrompt,
      raw_response: response.content,
      parsed_response: JSON.stringify(parsed),
      retry_count: retryCount,
      action: parsed.action,
      reasoning: parsed.reasoning,
      tokens_input: response.usage.prompt_tokens,
      tokens_output: response.usage.completion_tokens,
      api_cost_usd: estimateCost(response.usage, agent.model.openrouter_id),
      response_time_ms: response.response_time_ms,
      error_message: null
    });

    result.decision_id = decision.id;
    result.action = parsed.action;

    const {
      attemptedTrades,
      tradesExecuted,
      executionErrors
    } = executeDecisionTrades(agent.id, parsed, decision.id);

    result.trades_executed = tradesExecuted;

    if (
      (parsed.action === 'BET' || parsed.action === 'SELL') &&
      attemptedTrades > 0 &&
      tradesExecuted === 0
    ) {
      result.success = false;
      result.error = executionErrors.join('; ') || `All ${parsed.action.toLowerCase()} executions failed`;

      logSystemEvent('agent_decision_execution_failed', {
        agent_id: agent.id,
        decision_id: decision.id,
        action: parsed.action,
        errors: executionErrors
      }, 'error');

      console.log(`${agent.model.display_name}: ${parsed.action} (0 trades, retryable failure)`);
      return result;
    }

    result.success = true;
    console.log(`${agent.model.display_name}: ${parsed.action} (${tradesExecuted} trades)`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.error = message;

    if (claimedDecisionId) {
      markDecisionAsError(claimedDecisionId, message, {
        prompt_system: systemPrompt,
        prompt_user: userPrompt,
        raw_response: rawResponse,
        retry_count: retryCount
      });
    }

    logSystemEvent('agent_decision_error', {
      agent_id: agent.id,
      model_id: agent.model_id,
      error: message
    }, 'error');

    return result;
  }
}
