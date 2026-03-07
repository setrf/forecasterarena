import { buildDecisionUserPrompt } from '@/lib/engine/decision/buildDecisionUserPrompt';
import { executeDecisionTrades } from '@/lib/engine/decision/executeDecisionTrades';
import { claimAgentDecisionForProcessing } from '@/lib/engine/decision/processAgentDecision/claim';
import {
  handleDecisionError,
  handleExecutionFailure
} from '@/lib/engine/decision/processAgentDecision/errors';
import { finalizeProcessedDecision } from '@/lib/engine/decision/processAgentDecision/finalize';
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
    const decisionClaim = claimAgentDecisionForProcessing(agent, cohortId, weekNumber, result);
    if (decisionClaim.skippedResult) {
      return decisionClaim.skippedResult;
    }

    const decisionId = decisionClaim.claimedDecisionId;
    if (!decisionId) {
      throw new Error('Claimed decision id missing');
    }

    claimedDecisionId = decisionId;
    result.decision_id = decisionId;

    console.log(`Processing decision for ${agent.model.display_name}...`);

    userPrompt = buildDecisionUserPrompt(agent, markets, weekNumber);

    const decisionOutput = await requestDecisionWithRetries({
      agent,
      systemPrompt,
      userPrompt
    });

    rawResponse = decisionOutput.response.content;
    retryCount = decisionOutput.retryCount;

    const decision = finalizeProcessedDecision({
      agent,
      decisionId,
      systemPrompt,
      userPrompt,
      decisionAttempt: decisionOutput
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
