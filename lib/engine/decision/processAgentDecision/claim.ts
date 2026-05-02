import { claimDecisionForProcessing } from '@/lib/db/queries';
import { LLM_TIMEOUT_MS } from '@/lib/constants';
import type { AgentDecisionResult } from '@/lib/engine/decision/types';
import type { AgentWithModel } from '@/lib/types';

type DecisionClaimOutcome =
  | {
      status: 'claimed';
      claimedDecisionId: string;
    }
  | {
      status: 'skipped';
      skippedResult: AgentDecisionResult;
    };

export function claimAgentDecisionForProcessing(
  agent: AgentWithModel,
  cohortId: string,
  weekNumber: number,
  result: AgentDecisionResult
): DecisionClaimOutcome {
  if (agent.status === 'bankrupt') {
    return {
      status: 'skipped',
      skippedResult: {
        ...result,
        action: 'SKIPPED',
        success: true
      }
    };
  }

  const decisionClaim = claimDecisionForProcessing({
    agent_id: agent.id,
    cohort_id: cohortId,
    decision_week: weekNumber,
    stale_after_ms: LLM_TIMEOUT_MS * 2
  });

  if (decisionClaim.status === 'skipped') {
    if (
      (decisionClaim.decision.action === 'BET' || decisionClaim.decision.action === 'SELL') &&
      decisionClaim.decision.error_message
    ) {
      return {
        status: 'skipped',
        skippedResult: {
          ...result,
          decision_id: decisionClaim.decision.id,
          action: decisionClaim.decision.action,
          error: decisionClaim.decision.error_message,
          success: false
        }
      };
    }

    return {
      status: 'skipped',
      skippedResult: {
        ...result,
        decision_id: decisionClaim.decision.id,
        action: 'SKIPPED',
        success: true
      }
    };
  }

  return {
    status: 'claimed',
    claimedDecisionId: decisionClaim.decision.id
  };
}
