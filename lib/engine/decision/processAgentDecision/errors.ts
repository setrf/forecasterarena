import { logSystemEvent } from '@/lib/db';
import { markDecisionAsError } from '@/lib/db/queries';
import type { AgentDecisionResult } from '@/lib/engine/decision/types';
import type { AgentWithModel } from '@/lib/types';

export function handleExecutionFailure(args: {
  agent: AgentWithModel;
  decisionId: string;
  action: 'BET' | 'SELL';
  errors: string[];
  result: AgentDecisionResult;
}): AgentDecisionResult {
  args.result.success = false;
  args.result.error = args.errors.join('; ') || `All ${args.action.toLowerCase()} executions failed`;

  logSystemEvent('agent_decision_execution_failed', {
    agent_id: args.agent.id,
    decision_id: args.decisionId,
    action: args.action,
    errors: args.errors
  }, 'error');

  console.log(`${args.agent.model.display_name}: ${args.action} (0 trades, retryable failure)`);
  return args.result;
}

export function handleDecisionError(args: {
  agent: AgentWithModel;
  result: AgentDecisionResult;
  claimedDecisionId: string | null;
  systemPrompt: string;
  userPrompt: string;
  rawResponse?: string;
  retryCount: number;
  error: unknown;
}): AgentDecisionResult {
  const message = args.error instanceof Error ? args.error.message : String(args.error);
  args.result.error = message;

  if (args.claimedDecisionId) {
    markDecisionAsError(args.claimedDecisionId, message, {
      prompt_system: args.systemPrompt,
      prompt_user: args.userPrompt,
      raw_response: args.rawResponse,
      retry_count: args.retryCount
    });
  }

  logSystemEvent('agent_decision_error', {
    agent_id: args.agent.id,
    model_id: args.agent.model_id,
    error: message
  }, 'error');

  return args.result;
}
