import { logSystemEvent } from '@/lib/db';
import { markDecisionAsError } from '@/lib/db/queries';
import type { AgentDecisionResult } from '@/lib/engine/decision/types';
import type { AgentWithModel } from '@/lib/types';

export function handleExecutionFailure(args: {
  agent: AgentWithModel;
  decisionId: string;
  action: 'BET' | 'SELL';
  attemptedTrades: number;
  tradesExecuted: number;
  errors: string[];
  result: AgentDecisionResult;
}): AgentDecisionResult {
  args.result.success = false;
  const failedTrades = Math.max(0, args.attemptedTrades - args.tradesExecuted);
  args.result.error = args.errors.join('; ') || (
    failedTrades === args.attemptedTrades
      ? `All ${args.action.toLowerCase()} executions failed`
      : `${failedTrades} ${args.action.toLowerCase()} execution(s) failed after ${args.tradesExecuted} succeeded`
  );

  logSystemEvent('agent_decision_execution_failed', {
    agent_id: args.agent.id,
    decision_id: args.decisionId,
    action: args.action,
    attempted_trades: args.attemptedTrades,
    trades_executed: args.tradesExecuted,
    errors: args.errors
  }, 'error');

  console.log(
    `${args.agent.model.display_name}: ${args.action} ` +
    `(${args.tradesExecuted}/${args.attemptedTrades} trades executed, failure)`
  );
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
