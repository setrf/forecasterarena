import { LLM_MAX_RETRIES } from '@/lib/constants';
import { callOpenRouterWithRetry } from '@/lib/openrouter/client';
import { buildRetryPrompt } from '@/lib/openrouter/prompts';
import {
  getDefaultHoldDecision,
  isValidDecision,
  parseDecision
} from '@/lib/openrouter/parser';
import type { ParsedDecision } from '@/lib/openrouter/parser';
import type { AgentWithModel } from '@/lib/types';

export interface DecisionAttempt {
  parsed: ParsedDecision;
  response: Awaited<ReturnType<typeof callOpenRouterWithRetry>>;
  retryCount: number;
}

export async function requestDecisionWithRetries(args: {
  agent: AgentWithModel;
  systemPrompt: string;
  userPrompt: string;
}): Promise<DecisionAttempt> {
  let retryCount = 0;
  let response = await callOpenRouterWithRetry(
    args.agent.model.openrouter_id,
    args.systemPrompt,
    args.userPrompt
  );
  let parsed = parseDecision(response.content, args.agent.cash_balance);

  while (!isValidDecision(parsed) && retryCount < LLM_MAX_RETRIES) {
    console.log(`Retrying ${args.agent.model.display_name} due to invalid response...`);

    const retryPrompt = buildRetryPrompt(
      args.userPrompt,
      response.content,
      parsed.error || 'Unknown error'
    );

    response = await callOpenRouterWithRetry(
      args.agent.model.openrouter_id,
      args.systemPrompt,
      retryPrompt
    );

    parsed = parseDecision(response.content, args.agent.cash_balance);
    retryCount += 1;
  }

  if (!isValidDecision(parsed)) {
    console.log(`${args.agent.model.display_name} failed to produce valid response, defaulting to HOLD`);
    parsed = getDefaultHoldDecision(`Failed after ${retryCount} retries: ${parsed.error}`);
  }

  return { parsed, response, retryCount };
}
